"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getCurrentSessionId, updateSessionStatusRequest } from "@/lib/session-client";
import { useStageTelemetry } from "@/lib/telemetry";

interface MatchingPlaceholderClientProps {
  studySlug: string;
  trialCount: number;
}

export function MatchingPlaceholderClient({ studySlug, trialCount }: MatchingPlaceholderClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useStageTelemetry(sessionId, "matching");

  useEffect(() => {
    const resolvedSessionId = searchParams.get("session") ?? getCurrentSessionId(studySlug);
    if (!resolvedSessionId) {
      router.replace(`/study/${studySlug}/start`);
      return;
    }

    setSessionId(resolvedSessionId);
    void updateSessionStatusRequest(resolvedSessionId, "matching").catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to enter matching phase.");
    });
  }, [router, searchParams, studySlug]);

  async function finishAvailablePhases() {
    if (!sessionId) {
      return;
    }

    try {
      setIsPending(true);
      setError(null);
      await updateSessionStatusRequest(sessionId, "complete");
      router.push(`/study/${studySlug}/complete?session=${sessionId}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to complete the session.");
      setIsPending(false);
    }
  }

  return (
    <section className="panel">
      <div className="trial-header">
        <span className="pill">Matching task next</span>
        <span className="pill">{trialCount} planned trials</span>
      </div>
      <p className="status">
        The picture-word matching materials are loaded. The interactive matching task will be added in the next pass.
      </p>
      {error ? <p className="status error-text">{error}</p> : null}
      <div className="actions">
        <button type="button" className="button" onClick={finishAvailablePhases} disabled={isPending}>
          Finish available phases
        </button>
      </div>
    </section>
  );
}
