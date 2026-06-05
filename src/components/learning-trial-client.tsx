"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { buildStudyPathWithSession, submitComprehensionRequest, updateCachedSessionBundle } from "@/lib/session-client";
import { getLearningTrialOrThrow, getStudyOrThrow } from "@/lib/study";
import { useStageTelemetry } from "@/lib/telemetry";
import type { SessionBundle, YesNoAnswer } from "@/lib/types";
import { useStudySessionBundle } from "@/components/use-study-session-bundle";

interface LearningTrialClientProps {
  studySlug: string;
  trialIndex: number;
  progressLabel: string;
}

export function LearningTrialClient({ studySlug, trialIndex, progressLabel }: LearningTrialClientProps) {
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

  const nextLearningPath = useMemo(() => {
    if (!bundle) {
      return null;
    }

    const nextTrial = bundle.session.versionId
      ? study.versions.find((version) => version.id === bundle.session.versionId)?.learningTrials.find((entry) => entry.trialIndex === trialIndex + 1)
      : null;

    return nextTrial
      ? buildStudyPathWithSession(studySlug, `learn/${nextTrial.trialIndex}`, bundle.session.id)
      : buildStudyPathWithSession(studySlug, "distractor", bundle.session.id);
  }, [bundle, study.versions, studySlug, trialIndex]);

  useEffect(() => {
    if (!bundle) {
      return;
    }

    setStartedAt(performance.now());
  }, [bundle]);

  useEffect(() => {
    if (!nextLearningPath) {
      return;
    }

    router.prefetch(nextLearningPath);
  }, [nextLearningPath, router]);

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
    if (!sessionId || !trial || startedAt === null || !bundle || !nextLearningPath) {
      return;
    }

    setIsPending(true);
    setError(null);
    const responseTimeMs = Math.max(1, Math.round(performance.now() - startedAt));
    const now = new Date().toISOString();

    updateCachedSessionBundle<SessionBundle>(studySlug, sessionId, (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        session: {
          ...current.session,
          status: nextLearningPath.includes("/distractor") ? "distractor" : "learning",
          updatedAt: now
        },
        comprehension: current.comprehension.some((entry) => entry.trialIndex === trialIndex)
          ? current.comprehension
          : [
              ...current.comprehension,
              {
                sessionId,
                studySlug: current.session.studySlug,
                versionId: current.session.versionId,
                trialIndex,
                answer,
                correct: trial.correctAnswer === answer,
                responseTimeMs,
                answeredAt: now
              }
            ]
      };
    });

    void submitComprehensionRequest(sessionId, trialIndex, answer, responseTimeMs).catch((caughtError) => {
      console.error(caughtError);
    });

    startTransition(() => {
      router.push(nextLearningPath);
    });
    setIsPending(false);
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

      <EditableContentText contentKey="appText.study.learning.progressLabel" tag="p" className="study-progress study-progress-bottom">
        {progressLabel}
      </EditableContentText>
    </section>
  );
}
