"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getCurrentSessionId, getSessionBundleRequest, updateSessionStatusRequest } from "@/lib/session-client";
import { useStageTelemetry } from "@/lib/telemetry";

interface InstructionsClientProps {
  studySlug: string;
}

export function InstructionsClient({ studySlug }: InstructionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
  const [versionNumber, setVersionNumber] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useStageTelemetry(sessionId, "instructions");

  useEffect(() => {
    const fromUrl = searchParams.get("session");
    const resolvedSessionId = fromUrl ?? getCurrentSessionId(studySlug);

    if (!resolvedSessionId) {
      router.replace(`/study/${studySlug}/start`);
      return;
    }

    setSessionId(resolvedSessionId);

    void getSessionBundleRequest(resolvedSessionId)
      .then((bundle) => {
        setVersionNumber(bundle.session.versionNumber);
        return updateSessionStatusRequest(resolvedSessionId, "instructions");
      })
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load the session.");
      });
  }, [router, searchParams, studySlug]);

  async function beginLearning() {
    if (!sessionId) {
      return;
    }

    try {
      setIsPending(true);
      await updateSessionStatusRequest(sessionId, "learning");
      startTransition(() => {
        router.push(`/study/${studySlug}/learn/1?session=${sessionId}`);
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to continue.");
      setIsPending(false);
    }
  }

  return (
    <section className={`panel${error ? " error-card" : ""}`}>
      <div className="stack">
        <div>
          <span className="pill">{versionNumber ? `Assigned version ${versionNumber}` : "Loading version..."}</span>
        </div>

        <ol className="list">
          <li>Read each passage carefully on its own screen.</li>
          <li>After each passage, answer one yes/no comprehension question.</li>
          <li>Try to complete the phase in one sitting without switching tabs or apps.</li>
          <li>The reading phase ends after the 30th passage.</li>
        </ol>

        <div className="actions">
          <button type="button" className="button" onClick={beginLearning} disabled={isPending || !sessionId}>
            {isPending ? "Opening first passage..." : "Begin reading"}
          </button>
          <button type="button" className="button button-secondary" onClick={() => router.push(`/study/${studySlug}/start`)}>
            Back
          </button>
        </div>

        {error ? <p className="status">{error}</p> : null}
      </div>
    </section>
  );
}
