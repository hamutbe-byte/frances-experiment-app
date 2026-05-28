"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { buildStudyPathWithSession, updateSessionStatusRequest } from "@/lib/session-client";
import { useStageTelemetry } from "@/lib/telemetry";
import { useStudySessionBundle } from "@/components/use-study-session-bundle";

interface InstructionsClientProps {
  studySlug: string;
}

export function InstructionsClient({ studySlug }: InstructionsClientProps) {
  const router = useRouter();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
  const instructionText = snapshot.instructionText as typeof import("@/content/instruction-text").instructionText;
  const { sessionId, error: sessionError, isResolvingSession } = useStudySessionBundle({
    studySlug,
    stage: "instructions",
    loadErrorMessage: appText.study.instructions.loadError,
    stageErrorMessage: appText.study.instructions.continueError
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useStageTelemetry(sessionId, "instructions");

  async function beginLearning() {
    if (!sessionId) {
      return;
    }

    try {
      setIsPending(true);
      await updateSessionStatusRequest(sessionId, "learning");
      startTransition(() => {
        router.push(buildStudyPathWithSession(studySlug, "learn/1", sessionId));
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : appText.study.instructions.continueError);
      setIsPending(false);
    }
  }

  return (
    <section className={`panel screen-panel${sessionError || error ? " error-card" : ""}`}>
      {isResolvingSession ? <p className="status">{appText.study.instructions.loading}</p> : null}
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

      {sessionError ? <p className="status">{sessionError}</p> : null}
      {error ? <p className="status">{error}</p> : null}
    </section>
  );
}
