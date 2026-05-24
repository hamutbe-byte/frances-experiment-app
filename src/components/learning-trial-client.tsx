"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { formatContent } from "@/lib/content";
import { getCurrentSessionId, getSessionBundleRequest, submitComprehensionRequest } from "@/lib/session-client";
import { getLearningTrialOrThrow, getStudyOrThrow } from "@/lib/study";
import { useStageTelemetry } from "@/lib/telemetry";
import type { SessionBundle, YesNoAnswer } from "@/lib/types";

interface LearningTrialClientProps {
  studySlug: string;
  trialIndex: number;
}

export function LearningTrialClient({ studySlug, trialIndex }: LearningTrialClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
  const instructionText = snapshot.instructionText as typeof import("@/content/instruction-text").instructionText;
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const study = useMemo(() => getStudyOrThrow(studySlug), [studySlug]);

  useStageTelemetry(sessionId, "learning");

  useEffect(() => {
    const fromUrl = searchParams.get("session");
    const isDevJump = searchParams.get("devJump") === "1";
    const resolvedSessionId = fromUrl ?? getCurrentSessionId(studySlug);
    if (!resolvedSessionId) {
      router.replace(`/study/${studySlug}/start`);
      return;
    }

    setSessionId(resolvedSessionId);

    void getSessionBundleRequest(resolvedSessionId)
      .then((result) => {
        const alreadyAnswered = result.comprehension.some((entry) => entry.trialIndex === trialIndex);
        if (alreadyAnswered && !isDevJump) {
          const totalTrials = study.versions.find((version) => version.id === result.session.versionId)?.learningTrials.length ?? 30;
          const nextPath =
            trialIndex >= totalTrials
              ? `/study/${studySlug}/distractor?session=${resolvedSessionId}`
              : `/study/${studySlug}/learn/${trialIndex + 1}?session=${resolvedSessionId}`;
          startTransition(() => {
            router.replace(nextPath);
          });
          return;
        }
        setBundle(result);
        setStartedAt(performance.now());
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : appText.study.learning.loadError);
      });
  }, [router, searchParams, studySlug, trialIndex, study.versions]);

  useEffect(() => {
    if (!bundle) {
      return;
    }

    const nextTrial = bundle.session.versionId
      ? study.versions.find((version) => version.id === bundle.session.versionId)?.learningTrials.find((entry) => entry.trialIndex === trialIndex + 1)
      : null;

    if (nextTrial) {
      router.prefetch(`/study/${studySlug}/learn/${nextTrial.trialIndex}?session=${bundle.session.id}`);
    } else {
      router.prefetch(`/study/${studySlug}/distractor?session=${bundle.session.id}`);
    }
  }, [bundle, router, study, studySlug, trialIndex]);

  const trial = useMemo(() => {
    if (!bundle) {
      return null;
    }

    try {
      return getLearningTrialOrThrow(studySlug, bundle.session.versionId, trialIndex);
    } catch {
      return null;
    }
  }, [bundle, studySlug, trialIndex]);

  async function submitAnswer(answer: YesNoAnswer) {
    if (!sessionId || !trial || startedAt === null) {
      return;
    }

    try {
      setIsPending(true);
      setError(null);
      const responseTimeMs = Math.max(1, Math.round(performance.now() - startedAt));
      const result = await submitComprehensionRequest(sessionId, trialIndex, answer, responseTimeMs);

      if (result.completed) {
        startTransition(() => {
          router.push(`/study/${studySlug}/distractor?session=${sessionId}`);
        });
        return;
      }

      startTransition(() => {
        router.push(`/study/${studySlug}/learn/${result.nextTrialIndex}?session=${sessionId}`);
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : appText.study.learning.saveError);
      setIsPending(false);
    }
  }

  if (error) {
    return (
      <section className="panel error-card">
        <p className="status">{error}</p>
      </section>
    );
  }

  if (!bundle || !trial) {
    return (
      <section className="panel">
        <p className="status">{appText.study.learning.loading}</p>
      </section>
    );
  }

  const progress = Math.round((trial.trialIndex / study.versions[0].learningTrials.length) * 100);

  return (
    <section className="panel screen-panel">
      <div className="trial-header">
        <EditableContentText contentKey="appText.study.learning.progressLabel" tag="div" className="pill">
          {formatContent(appText.study.learning.progressLabel, {
            current: trial.trialIndex,
            total: study.versions[0].learningTrials.length
          })}
        </EditableContentText>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="passage" dir="ltr">
        {trial.passageText}
      </article>

      <section className="question-block">
        <EditableContentText contentKey="instructionText.study.learning.comprehensionLabel" tag="span" className="question-label">
          {instructionText.study.learning.comprehensionLabel}
        </EditableContentText>
        <p className="question-text" dir="ltr">
          {trial.comprehensionPromptText}
        </p>

        <div className="answer-grid">
          <button type="button" className="button answer-button" onClick={() => submitAnswer("yes")} disabled={isPending}>
            <strong>Yes</strong>
            <EditableContentText contentKey="instructionText.study.learning.yesExplanation" tag="span">
              {instructionText.study.learning.yesExplanation}
            </EditableContentText>
          </button>
          <button type="button" className="button answer-button" onClick={() => submitAnswer("no")} disabled={isPending}>
            <strong>No</strong>
            <EditableContentText contentKey="instructionText.study.learning.noExplanation" tag="span">
              {instructionText.study.learning.noExplanation}
            </EditableContentText>
          </button>
        </div>
      </section>
    </section>
  );
}
