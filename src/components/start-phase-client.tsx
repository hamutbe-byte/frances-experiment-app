"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { getDeviceSnapshot } from "@/lib/browser";
import { createSessionRequest, saveCurrentSessionId } from "@/lib/session-client";

interface StartPhaseClientProps {
  studySlug: string;
  passageCount: number;
  versionCount: number;
}

export function StartPhaseClient({ studySlug, passageCount, versionCount }: StartPhaseClientProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startStudy() {
    try {
      setIsPending(true);
      setError(null);
      const result = await createSessionRequest(studySlug, getDeviceSnapshot());
      saveCurrentSessionId(studySlug, result.session.id);
      startTransition(() => {
        router.push(result.nextPath);
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to start the study.");
      setIsPending(false);
    }
  }

  return (
    <section className="panel">
      <div className="meta-grid">
        <div className="meta-card">
          <span className="meta-label">Reading Trials</span>
          <span className="meta-value">{passageCount}</span>
        </div>
        <div className="meta-card">
          <span className="meta-label">Study Versions</span>
          <span className="meta-value">{versionCount}</span>
        </div>
        <div className="meta-card">
          <span className="meta-label">Current Scope</span>
          <span className="meta-value">Learning phase only</span>
        </div>
      </div>

      <div className="actions">
        <button type="button" className="button" onClick={startStudy} disabled={isPending}>
          {isPending ? "Preparing your session..." : "Start reading phase"}
        </button>
      </div>

      {error ? <p className="status">{error}</p> : null}
    </section>
  );
}
