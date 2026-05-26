"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { getCurrentSessionId, getSessionBundleRequest, submitMatchingRequest, updateSessionStatusRequest } from "@/lib/session-client";
import { getStudyOrThrow } from "@/lib/study";
import { useStageTelemetry } from "@/lib/telemetry";
import type { MatchingTrial } from "@/lib/types";

interface MatchingTaskClientProps {
  studySlug: string;
}

export function MatchingTaskClient({ studySlug }: MatchingTaskClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
  const instructionText = snapshot.instructionText as typeof import("@/content/instruction-text").instructionText;
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
  const [trial, setTrial] = useState<MatchingTrial | null>(null);
  const [matchingOrder, setMatchingOrder] = useState<number[]>([]);
  const [answeredTrialIndexes, setAnsweredTrialIndexes] = useState<Set<number>>(new Set());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const study = useMemo(() => getStudyOrThrow(studySlug), [studySlug]);

  useStageTelemetry(sessionId, "matching");

  function trialByIndex(trialIndex: number) {
    return study.matchingTrials.find((entry) => entry.trialIndex === trialIndex) ?? null;
  }

  function firstUnansweredTrial(answered: Set<number>, order = matchingOrder) {
    const nextTrialIndex = order.find((trialIndex) => !answered.has(trialIndex));
    return nextTrialIndex ? trialByIndex(nextTrialIndex) : null;
  }

  function showTrial(nextTrial: MatchingTrial | null, order = matchingOrder) {
    if (!nextTrial) {
      setTrial(null);
      return;
    }

    setTrial(nextTrial);
    setStartedAt(performance.now());
    const nextOrderPosition = order.indexOf(nextTrial.trialIndex) + 1;
    const followingTrialIndex = order[nextOrderPosition];
    const followingTrial = followingTrialIndex ? trialByIndex(followingTrialIndex) : null;
    if (followingTrial) {
      const image = new window.Image();
      image.src = followingTrial.imagePath;
    }
  }

  useEffect(() => {
    const isDevJump = searchParams.get("devJump") === "1";
    const resolvedSessionId = searchParams.get("session") ?? getCurrentSessionId(studySlug);
    if (!resolvedSessionId) {
      router.replace(`/study/${studySlug}/start`);
      return;
    }

    setSessionId(resolvedSessionId);
    void getSessionBundleRequest(resolvedSessionId)
      .then((bundle) => {
        if (bundle.session.status === "complete") {
          setTrial(null);
          setStartedAt(null);
          setIsFinished(true);
          return;
        }

        void updateSessionStatusRequest(resolvedSessionId, "matching").catch(() => undefined);
        const order = bundle.session.matchingTrialOrder.length > 0 ? bundle.session.matchingTrialOrder : study.matchingTrials.map((entry) => entry.trialIndex);
        const answered = new Set(bundle.matching.map((entry) => entry.trialIndex));
        setMatchingOrder(order);
        setAnsweredTrialIndexes(answered);
        const nextTrial = isDevJump ? trialByIndex(order[0]) : firstUnansweredTrial(answered, order);
        if (!nextTrial) {
          setIsFinished(true);
          return;
        }
        showTrial(nextTrial, order);
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : appText.study.matching.loadError);
      });
  }, [router, searchParams, study, studySlug]);

  async function submitAnswer(answer: "yes" | "no") {
    if (isFinished || !sessionId || !trial || startedAt === null || isPending) {
      return;
    }

    try {
      setIsPending(true);
      setError(null);
      const responseTimeMs = Math.max(1, Math.round(performance.now() - startedAt));
      const result = await submitMatchingRequest(sessionId, trial.trialIndex, answer, responseTimeMs);
      if (result.completed) {
        setTrial(null);
        setStartedAt(null);
        setIsFinished(true);
        return;
      }

      setAnsweredTrialIndexes((current) => {
        const next = new Set(current);
        next.add(trial.trialIndex);
        const nextTrial = firstUnansweredTrial(next);
        showTrial(nextTrial);
        return next;
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : appText.study.matching.saveError);
    } finally {
      setIsPending(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        void submitAnswer("yes");
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void submitAnswer("no");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFinished, isPending, sessionId, startedAt, trial]);

  if (error) {
    return (
      <section className="panel error-card">
        <p className="status">{error}</p>
      </section>
    );
  }

  if (isFinished) {
    return (
      <section className="panel screen-panel">
        <EditableContentText contentKey="appText.study.matching.finishedTitle" tag="p" className="status">
          {appText.study.matching.finishedTitle}
        </EditableContentText>
        <p>{appText.study.matching.finishedDescription}</p>
      </section>
    );
  }

  if (!trial) {
    return (
      <section className="panel">
        <p className="status">{appText.study.matching.loading}</p>
      </section>
    );
  }

  return (
    <section className="panel matching-panel screen-panel">
      <div className="matching-stimulus">
        <img src={trial.imagePath} alt="" className="matching-image" draggable={false} />
        <div className="matching-word" dir="ltr">
          {trial.displayWord}
        </div>
      </div>

      <section className="question-block">
        <EditableContentText contentKey="instructionText.study.matching.questionLabel" tag="span" className="question-label">
          {instructionText.study.matching.questionLabel}
        </EditableContentText>
        <div className="answer-grid">
          <button type="button" className="button answer-button" onClick={() => submitAnswer("no")} disabled={isPending}>
            <strong>No</strong>
            <EditableContentText contentKey="instructionText.study.matching.noKeyHint" tag="span">
              {instructionText.study.matching.noKeyHint}
            </EditableContentText>
          </button>
          <button type="button" className="button answer-button" onClick={() => submitAnswer("yes")} disabled={isPending}>
            <strong>Yes</strong>
            <EditableContentText contentKey="instructionText.study.matching.yesKeyHint" tag="span">
              {instructionText.study.matching.yesKeyHint}
            </EditableContentText>
          </button>
        </div>
      </section>
    </section>
  );
}
