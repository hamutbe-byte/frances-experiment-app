"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { appText } from "@/content/app-text";
import { getCurrentSessionId, getSessionBundleRequest } from "@/lib/session-client";

interface CompletePhaseClientProps {
  studySlug: string;
}

export function CompletePhaseClient({ studySlug }: CompletePhaseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(appText.study.complete.loading);

  useEffect(() => {
    const fromUrl = searchParams.get("session");
    const resolvedSessionId = fromUrl ?? getCurrentSessionId(studySlug);
    if (!resolvedSessionId) {
      router.replace(`/study/${studySlug}/start`);
      return;
    }

    void getSessionBundleRequest(resolvedSessionId)
      .then((bundle) => {
        setCode(bundle.session.completionCode);
        setStatus(appText.study.complete.success);
      })
      .catch(() => {
        setStatus(appText.study.complete.fallback);
      });
  }, [router, searchParams, studySlug]);

  return (
    <section className="panel">
      <p className="status">{status}</p>
      {code ? <div className="completion-code">{code}</div> : null}
      <div className="actions">
        <button type="button" className="button button-secondary" onClick={() => router.push(`/study/${studySlug}/start`)}>
          {appText.study.complete.backToStartButton}
        </button>
      </div>
    </section>
  );
}
