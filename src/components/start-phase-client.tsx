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
      setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה להתחיל את המחקר.");
      setIsPending(false);
    }
  }

  return (
    <section className="panel">
      <div className="meta-grid">
        <div className="meta-card">
          <span className="meta-label">קטעי קריאה</span>
          <span className="meta-value">{passageCount}</span>
        </div>
        <div className="meta-card">
          <span className="meta-label">גרסאות מחקר</span>
          <span className="meta-value">{versionCount}</span>
        </div>
        <div className="meta-card">
          <span className="meta-label">שלבים</span>
          <span className="meta-value">קריאה, זיכרון והתאמה</span>
        </div>
      </div>

      <div className="actions">
        <button type="button" className="button" onClick={startStudy} disabled={isPending}>
          {isPending ? "מכין את ההשתתפות שלך..." : "התחילו בניסוי"}
        </button>
      </div>

      {error ? <p className="status">{error}</p> : null}
    </section>
  );
}
