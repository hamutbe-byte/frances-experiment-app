"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

const devToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";
const durationMs = 10 * 60 * 1000;
const cueDurationMs = 500;
const cueGapMs = 0;
const feedbackDurationMs = 1400;
const distractorEndsAtKey = (sessionId: string) => `frances-distractor-ends-at:${sessionId}`;

type Mode = "ready" | "showing" | "responding" | "saving";
type Feedback = {
  kind: "correct" | "incorrect";
  message: string;
} | null;

export function DistractorClient({ studySlug }: DistractorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
  const [trialIndex, setTrialIndex] = useState(1);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
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
      router.replace(`/study/${studySlug}/start`);
      return;
    }

    setSessionId(resolvedSessionId);
    void getSessionBundleRequest(resolvedSessionId)
      .then((bundle) => {
        setAnsweredCount(bundle.distractor.length);
        setCorrectCount(bundle.distractor.filter((entry) => entry.correct).length);
        setTrialIndex(bundle.distractor.length + 1);

        const savedEndsAt = window.localStorage.getItem(distractorEndsAtKey(resolvedSessionId));
        const nextEndsAt = savedEndsAt ? Number(savedEndsAt) : Date.now() + durationMs;
        window.localStorage.setItem(distractorEndsAtKey(resolvedSessionId), String(nextEndsAt));
        setEndsAt(nextEndsAt);
        setShowInstructions(bundle.distractor.length === 0);
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה לטעון את ההתקדמות במשימת ההסחה.");
      });

    void updateSessionStatusRequest(resolvedSessionId, "distractor").catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה להתחיל את משימת ההסחה.");
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
      scheduled.push(
        window.setTimeout(() => {
          setActiveBlockIndex(blockIndex);
        }, cueStart)
      );
      scheduled.push(
        window.setTimeout(() => {
          setActiveBlockIndex(null);
        }, cueStart + cueDurationMs)
      );
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
        message: result.correct ? "נכון" : "לא נכון"
      });
      if (result.correct) {
        setCorrectCount((count) => count + 1);
      }
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null);
        feedbackTimeoutRef.current = null;
      }, feedbackDurationMs);

      setAnsweredCount((count) => count + 1);
      setTrialIndex((current) => current + 1);
      setResponseSequence([]);
      setMode("ready");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה לשמור את התגובה במשימת ההסחה.");
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

  function continueToRecall() {
    if (!sessionId) {
      return;
    }
    window.localStorage.removeItem(distractorEndsAtKey(sessionId));
    router.push(`/study/${studySlug}/recall/1?session=${sessionId}`);
  }

  return (
    <section className="panel corsi-panel">
      <div className="trial-header">
        <span className="countdown">{remainingLabel}</span>
      </div>

      {showInstructions ? (
        <section className="corsi-instructions" aria-label="הוראות למשימת קורסי">
          <p className="status">
            בכל ניסיון יוצג רצף של ריבועים מודגשים. לאחר שהרצף יסתיים, לחצו על הריבועים לפי הסדר המתאים.
          </p>
          <ol className="list">
            <li>כאשר מוצג ניסיון <strong>קדימה</strong>, לחצו על הריבועים באותו הסדר שבו הם הופיעו.</li>
            <li>כאשר מוצג ניסיון <strong>אחורה</strong>, לחצו על הריבועים בסדר הפוך.</li>
            <li>כל ריבוע יואר למשך חצי שנייה לפני שהרצף יעבור לריבוע הבא.</li>
            <li>המשיכו לבצע ניסיונות עד שתסתיים הפסקת 10 הדקות.</li>
          </ol>
          <div className="actions">
            <button type="button" className="button" onClick={startSequence} disabled={!trial || mode !== "ready" || remainingMs <= 0}>
              התחילו את הרצף הבא
            </button>
          </div>
        </section>
      ) : (
        <div className="corsi-stage-layout">
          <div className="corsi-lab-frame">
            <div className="corsi-status-strip" aria-hidden="true">
              <span className={`corsi-status-dot ${mode === "showing" ? "is-on" : ""}`} />
              <span className={`corsi-status-dot ${mode === "responding" ? "is-on" : ""}`} />
              <span className={`corsi-status-dot ${mode === "saving" ? "is-on" : ""}`} />
            </div>

            <div className="corsi-board" aria-label="לוח משימת קורסי" dir="ltr">
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
                  aria-label={`ריבוע ${block.blockIndex + 1}`}
                />
              ))}
            </div>
          </div>

          <aside className="corsi-sidecar">
            <div className="corsi-sidecar-meta">
              <span className="pill">ניסיון {trialIndex}</span>
              {trial ? <span className="pill">{trial.direction === "forward" ? "קדימה" : "אחורה"}</span> : null}
              <span className="pill">ציון: {correctCount}</span>
            </div>

            {mode === "ready" ? (
              <div className="actions corsi-actions">
                <button type="button" className="button" onClick={startSequence} disabled={!trial || remainingMs <= 0}>
                  הרצף הבא
                </button>
              </div>
            ) : null}

            <p className="status corsi-mode-status">
              {mode === "showing" && "התבוננו ברצף הריבועים המודגשים."}
              {mode === "responding" && `כעת לחצו על הריבועים ${trial?.direction === "backward" ? "בסדר הפוך." : "באותו הסדר."}`}
              {mode === "saving" && "שומר את התגובה..."}
              {mode === "ready" && "לחצו על הכפתור כדי להתחיל את הרצף הבא."}
            </p>

            {trial && mode === "responding" ? <p className="status">נבחרו {responseSequence.length} מתוך {trial.sequenceLength} ריבועים.</p> : null}
          </aside>
        </div>
      )}

      {feedback ? <div className={`corsi-feedback is-${feedback.kind}`}>{feedback.message}</div> : null}
      {error ? <p className="status error-text">{error}</p> : null}

      {devToolsEnabled ? (
        <div className="actions">
          <button type="button" className="button" onClick={continueToRecall}>
            דלגו לשלב הזכירה
          </button>
        </div>
      ) : null}
    </section>
  );
}
