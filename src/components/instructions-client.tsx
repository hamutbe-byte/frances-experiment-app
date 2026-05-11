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
        setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה לטעון את ההשתתפות.");
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
      setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה להמשיך לשלב הבא.");
      setIsPending(false);
    }
  }

  return (
    <section className={`panel${error ? " error-card" : ""}`}>
      <div className="stack">
        <div>
          <span className="pill">{versionNumber ? `שובצתם לגרסה ${versionNumber}` : "טוען את פרטי הגרסה..."}</span>
        </div>

        <ol className="list">
          <li>קראו כל קטע באנגלית בעיון, במסך נפרד.</li>
          <li>לאחר כל קטע, ענו על שאלת הבנת הנקרא כפי שהיא מופיעה באנגלית.</li>
          <li>בהמשך תתבקשו להשלים משימות זיכרון והתאמה; גם התכנים של משימות אלה יופיעו באנגלית.</li>
          <li>נסו להשלים את כל הניסוי ברצף, בלי לעבור בין לשוניות או אפליקציות אחרות.</li>
        </ol>

        <div className="actions">
          <button type="button" className="button" onClick={beginLearning} disabled={isPending || !sessionId}>
            {isPending ? "פותח את הקטע הראשון..." : "התחילו בקריאה"}
          </button>
          <button type="button" className="button button-secondary" onClick={() => router.push(`/study/${studySlug}/start`)}>
            חזרה
          </button>
        </div>

        {error ? <p className="status">{error}</p> : null}
      </div>
    </section>
  );
}
