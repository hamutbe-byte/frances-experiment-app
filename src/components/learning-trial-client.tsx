"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { buildStudyPathWithSession, submitComprehensionRequest } from "@/lib/session-client";
import { getLearningTrialOrThrow, getStudyOrThrow } from "@/lib/study";
import { useStageTelemetry } from "@/lib/telemetry";
import type { YesNoAnswer } from "@/lib/types";
import { useStudySessionBundle } from "@/components/use-study-session-bundle";

interface LearningTrialClientProps {
  studySlug: string;
  trialIndex: number;
}

export function LearningTrialClient({ studySlug, trialIndex }: LearningTrialClientProps) {
  const router = useRouter();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
  const instructionText = snapshot.instructionText as typeof import("@/content/instruction-text").instructionText;
  const { sessionId, bundle, error: sessionError } = useStudySessionBundle({
    studySlug,
    stage: "learning",
    loadErrorMessage: appText.study.learning.loadError,
    stageErrorMessage: appText.study.learning.loadError
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const study = useMemo(() => getStudyOrThrow(studySlug), [studySlug]);

  useStageTelemetry(sessionId, "learning");

  useEffect(() => {
    if (!bundle) {
      return;
    }

    setStartedAt(performance.now());
  }, [bundle]);

  useEffect(() => {
    if (!bundle) {
      return;
    }

    const nextTrial = bundle.session.versionId
      ? study.versions.find((version) => version.id === bundle.session.versionId)?.learningTrials.find((entry) => entry.trialIndex === trialIndex + 1)
      : null;

    if (nextTrial) {
      router.prefetch(buildStudyPathWithSession(studySlug, `learn/${nextTrial.trialIndex}`, bundle.session.id));
    } else {
      router.prefetch(buildStudyPathWithSession(studySlug, "distractor", bundle.session.id));
    }
  }, [bundle, router, study.versions, studySlug, trialIndex]);

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
    if (!sessionId || !trial || startedAt === null || !bundle) {
      return;
    }

    setIsPending(true);
    setError(null);
    const responseTimeMs = Math.max(1, Math.round(performance.now() - startedAt));
    try {
      const result = await submitComprehensionRequest(sessionId, trialIndex, answer, responseTimeMs);

      startTransition(() => {
        router.push(
          result.completed
            ? buildStudyPathWithSession(studySlug, "distractor", sessionId)
            : buildStudyPathWithSession(studySlug, `learn/${result.nextTrialIndex}`, sessionId)
        );
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : appText.study.learning.saveError);
      setIsPending(false);
    }
  }

  if (sessionError || error) {
    return (
      <section className="panel error-card">
        <p className="status">{sessionError ?? error}</p>
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

  return (
    <section className="panel screen-panel">
      <EditableContentText contentKey="appText.study.learning.passageTextStyle" tag="article" className="passage" dir="ltr">
        {trial.passageText}
      </EditableContentText>

      <section className="question-block">
        <EditableContentText contentKey="instructionText.study.learning.comprehensionLabel" tag="span" className="question-label">
          {instructionText.study.learning.comprehensionLabel}
        </EditableContentText>
        <EditableContentText contentKey="appText.study.learning.questionTextStyle" tag="p" className="question-text" dir="ltr">
          {trial.comprehensionPromptText}
        </EditableContentText>

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
