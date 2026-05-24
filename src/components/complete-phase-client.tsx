"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { getCurrentSessionId, getSessionBundleRequest } from "@/lib/session-client";

interface CompletePhaseClientProps {
  studySlug: string;
}

export function CompletePhaseClient({ studySlug }: CompletePhaseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
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
    <section className="panel screen-panel">
      <EditableContentText contentKey={status === appText.study.complete.loading ? "appText.study.complete.loading" : status === appText.study.complete.success ? "appText.study.complete.success" : "appText.study.complete.fallback"} tag="p" className="status">
        {status}
      </EditableContentText>
      {code ? <div className="completion-code">{code}</div> : null}
      <div className="actions">
        <button type="button" className="button button-secondary" onClick={() => router.push(`/study/${studySlug}/start`)}>
          <EditableContentText contentKey="appText.study.complete.backToStartButton" tag="span">
            {appText.study.complete.backToStartButton}
          </EditableContentText>
        </button>
      </div>
    </section>
  );
}
