"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getCurrentSessionId, updateSessionStatusRequest } from "@/lib/session-client";
import { useStageTelemetry } from "@/lib/telemetry";

interface DistractorClientProps {
  studySlug: string;
}

const devToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";
const durationMs = 10 * 60 * 1000;

export function DistractorClient({ studySlug }: DistractorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  useStageTelemetry(sessionId, "distractor");

  useEffect(() => {
    const resolvedSessionId = searchParams.get("session") ?? getCurrentSessionId(studySlug);
    if (!resolvedSessionId) {
      router.replace(`/study/${studySlug}/start`);
      return;
    }

    setSessionId(resolvedSessionId);
    setEndsAt(Date.now() + durationMs);
    void updateSessionStatusRequest(resolvedSessionId, "distractor").catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to start the distractor break.");
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

    router.replace(`/study/${studySlug}/recall/1?session=${sessionId}`);
  }, [endsAt, remainingMs, router, sessionId, studySlug]);

  function continueToRecall() {
    if (!sessionId) {
      return;
    }
    router.push(`/study/${studySlug}/recall/1?session=${sessionId}`);
  }

  return (
    <section className="panel">
      <div className="trial-header">
        <span className="pill">Distractor placeholder</span>
        <span className="countdown">{remainingLabel}</span>
      </div>
      <p className="status">
        Please wait here before continuing to the memory questions. This placeholder preserves the experiment sequence.
      </p>
      {error ? <p className="status error-text">{error}</p> : null}
      {devToolsEnabled ? (
        <div className="actions">
          <button type="button" className="button" onClick={continueToRecall}>
            Skip to recall
          </button>
        </div>
      ) : null}
    </section>
  );
}
