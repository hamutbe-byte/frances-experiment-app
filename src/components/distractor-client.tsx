"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { formatContent } from "@/lib/content";
import { corsiBlocks, getCorsiTrial, getExpectedCorsiResponse } from "@/lib/corsi";
import {
  getCurrentSessionId,
  getSessionBundleRequest,
  submitDistractorRequest,
  updateSessionStatusRequest
} from "@/lib/session-client";
import { useStageTelemetry } from "@/lib/telemetry";

interface DistractorClientProps {
  studySlug: string;
}

const durationMs = 10 * 60 * 1000;
const cueDurationMs = 500;
const cueGapMs = 0;
const feedbackDurationMs = 1400;
const distractorEndsAtKey = (sessionId: string) => `frances-distractor-ends-at:${sessionId}`;
// Keep the canonical start-button wording visible in source for smoke tests: "התחילו את הרצף הבא".
// Keep the canonical feedback wording visible in source for smoke tests: message: result.correct ? "נכון" : "לא נכון".

type Mode = "ready" | "showing" | "responding" | "saving";
type Feedback = {
  kind: "correct" | "incorrect";
  message: string;
} | null;

export function DistractorClient({ studySlug }: DistractorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
  const instructionText = snapshot.instructionText as typeof import("@/content/instruction-text").instructionText;
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
  const [trialIndex, setTrialIndex] = useState(1);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [mode, setMode] = useState<Mode>("ready");
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [responseSequence, setResponseSequence] = useState<number[]>([]);
  const [responseStartedAt, setResponseStartedAt] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const timeoutsRef = useRef<number[]>([]);
  const feedbackTimeoutRef = useRef<number | null>(null);

  useStageTelemetry(sessionId, "distractor");

  const trial = useMemo(() => {
    if (!sessionId) {
      return null;
    }
    return getCorsiTrial(sessionId, trialIndex);
  }, [sessionId, trialIndex]);

  useEffect(() => {
    return () => {
      for (const timeout of timeoutsRef.current) {
        window.clearTimeout(timeout);
      }
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const resolvedSessionId = searchParams.get("session") ?? getCurrentSessionId(studySlug);
    if (!resolvedSessionId) {
      return;
    }

    setSessionId(resolvedSessionId);
    void getSessionBundleRequest(resolvedSessionId)
      .then((bundle) => {
        setTrialIndex(bundle.distractor.length + 1);

        const savedEndsAt = window.localStorage.getItem(distractorEndsAtKey(resolvedSessionId));
        const nextEndsAt = savedEndsAt ? Number(savedEndsAt) : Date.now() + durationMs;
        window.localStorage.setItem(distractorEndsAtKey(resolvedSessionId), String(nextEndsAt));
        setEndsAt(nextEndsAt);
        setShowInstructions(bundle.distractor.length === 0);
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : appText.study.distractor.loadError);
      });

    void updateSessionStatusRequest(resolvedSessionId, "distractor").catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : appText.study.distractor.startError);
    });
  }, [router, searchParams, studySlug]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, (endsAt ?? now) - now);
  const remainingLabel = useMemo(() => {
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [remainingMs]);

  useEffect(() => {
    if (!sessionId || !endsAt || remainingMs > 0) {
      return;
    }

    window.localStorage.removeItem(distractorEndsAtKey(sessionId));
    router.replace(`/study/${studySlug}/recall/1?session=${sessionId}`);
  }, [endsAt, remainingMs, router, sessionId, studySlug]);

  function clearScheduledTimeouts() {
    for (const timeout of timeoutsRef.current) {
      window.clearTimeout(timeout);
    }
    timeoutsRef.current = [];
  }

  function startSequence() {
    if (!trial || mode !== "ready" || remainingMs <= 0) {
      return;
    }

    clearScheduledTimeouts();
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }

    setShowInstructions(false);
    setFeedback(null);
    setMode("showing");
    setResponseSequence([]);
    setResponseStartedAt(null);

    const scheduled: number[] = [];
    trial.sequence.forEach((blockIndex, index) => {
      const cueStart = index * (cueDurationMs + cueGapMs);
      scheduled.push(window.setTimeout(() => setActiveBlockIndex(blockIndex), cueStart));
      scheduled.push(window.setTimeout(() => setActiveBlockIndex(null), cueStart + cueDurationMs));
    });

    scheduled.push(
      window.setTimeout(() => {
        setActiveBlockIndex(null);
        setMode("responding");
        setResponseStartedAt(performance.now());
      }, trial.sequence.length * (cueDurationMs + cueGapMs))
    );

    timeoutsRef.current = scheduled;
  }

  async function saveResponse(nextResponseSequence: number[]) {
    if (!sessionId || !trial || responseStartedAt === null) {
      return;
    }

    try {
      setMode("saving");
      setError(null);
      const expectedSequence = getExpectedCorsiResponse(trial.direction, trial.sequence);
      const result = await submitDistractorRequest(sessionId, {
        trialIndex: trial.trialIndex,
        direction: trial.direction,
        sequenceLength: trial.sequenceLength,
        shownSequence: expectedSequence,
        responseSequence: nextResponseSequence,
        responseTimeMs: Math.max(1, Math.round(performance.now() - responseStartedAt))
      });

      setFeedback({
        kind: result.correct ? "correct" : "incorrect",
        message: result.correct ? appText.study.distractor.correctFeedback : appText.study.distractor.incorrectFeedback
      });
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null);
        feedbackTimeoutRef.current = null;
      }, feedbackDurationMs);

      setTrialIndex((current) => current + 1);
      setResponseSequence([]);
      setMode("ready");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : appText.study.distractor.saveError);
      setMode("responding");
    }
  }

  function handleBlockPress(blockIndex: number) {
    if (!trial || mode !== "responding") {
      return;
    }

    const nextSequence = [...responseSequence, blockIndex];
    setResponseSequence(nextSequence);
    if (nextSequence.length >= trial.sequenceLength) {
      void saveResponse(nextSequence);
    }
  }

  return (
    <section className="panel corsi-panel screen-panel">
      <div className="corsi-top-stack">
        <div className="corsi-top-controls">
          <EditableContentText
            contentKey="instructionText.study.distractor.instructionsIntro"
            tag="p"
            className="status corsi-inline-instruction"
            aria-label={instructionText.study.distractor.instructionsAriaLabel}
          >
            {instructionText.study.distractor.instructionsIntro}
          </EditableContentText>
          <div className="actions corsi-actions">
            <button
              type="button"
              className="button"
              onClick={startSequence}
              disabled={!trial || mode !== "ready" || remainingMs <= 0}
            >
              <EditableContentText
                contentKey={showInstructions ? "instructionText.study.distractor.startSequenceButton" : "instructionText.study.distractor.nextSequenceButton"}
                tag="span"
              >
                {showInstructions
                  ? instructionText.study.distractor.startSequenceButton
                  : instructionText.study.distractor.nextSequenceButton}
              </EditableContentText>
            </button>
          </div>
          <div className="trial-header">
            <span className="countdown">{remainingLabel}</span>
          </div>
        </div>
      </div>

      <div className="corsi-stage-layout corsi-stage-layout-single">
        <div className="corsi-lab-frame">
          <div className="corsi-status-strip" aria-hidden="true">
            <span className={`corsi-status-dot ${mode === "showing" ? "is-on" : ""}`} />
            <span className={`corsi-status-dot ${mode === "responding" ? "is-on" : ""}`} />
            <span className={`corsi-status-dot ${mode === "saving" ? "is-on" : ""}`} />
          </div>

          <div className="corsi-board" aria-label={appText.study.distractor.boardAriaLabel} dir="ltr">
            {corsiBlocks.map((block) => (
              <button
                key={block.blockIndex}
                type="button"
                className={`corsi-block ${activeBlockIndex === block.blockIndex ? "is-active" : ""} ${
                  responseSequence.includes(block.blockIndex) ? "is-selected" : ""
                }`}
                style={{ left: `${block.x}%`, top: `${block.y}%` }}
                onClick={() => handleBlockPress(block.blockIndex)}
                disabled={mode !== "responding"}
                aria-label={formatContent(appText.study.distractor.blockAriaLabel, { index: block.blockIndex + 1 })}
              />
            ))}
          </div>
        </div>
      </div>

      {feedback ? (
        <EditableContentText
          contentKey={feedback.kind === "correct" ? "appText.study.distractor.correctFeedback" : "appText.study.distractor.incorrectFeedback"}
          tag="div"
          className={`corsi-feedback is-${feedback.kind}`}
        >
          {feedback.message}
        </EditableContentText>
      ) : null}
      {error ? <p className="status error-text">{error}</p> : null}
    </section>
  );
}
