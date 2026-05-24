"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { getCurrentSessionId, getSessionBundleRequest, updateSessionStatusRequest } from "@/lib/session-client";
import { useStageTelemetry } from "@/lib/telemetry";

interface InstructionsClientProps {
  studySlug: string;
}

export function InstructionsClient({ studySlug }: InstructionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
  const instructionText = snapshot.instructionText as typeof import("@/content/instruction-text").instructionText;
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
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
      .then(() => updateSessionStatusRequest(resolvedSessionId, "instructions"))
      .catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : appText.study.instructions.loadError);
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
      setError(caughtError instanceof Error ? caughtError.message : appText.study.instructions.continueError);
      setIsPending(false);
    }
  }

  return (
    <section className={`panel screen-panel${error ? " error-card" : ""}`}>
      <div className="actions">
        <button type="button" className="button" onClick={beginLearning} disabled={isPending || !sessionId}>
          {isPending ? (
            <EditableContentText contentKey="appText.study.instructions.openingFirstPassage" tag="span">
              {appText.study.instructions.openingFirstPassage}
            </EditableContentText>
          ) : (
            <EditableContentText contentKey="instructionText.study.instructionsPage.startReadingButton" tag="span">
              {instructionText.study.instructionsPage.startReadingButton}
            </EditableContentText>
          )}
        </button>
      </div>

      {error ? <p className="status">{error}</p> : null}
    </section>
  );
}
