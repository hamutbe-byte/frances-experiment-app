"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BilingualInstructionText } from "@/components/bilingual-instruction-text";
import { useResolvedContent } from "@/components/content-provider";
import { EditableContentText } from "@/components/editable-content-text";
import { buildStudyPathWithSession, sendTelemetryRequest, submitRecallRequest, submitRecognitionRequest } from "@/lib/session-client";
import { getRecallPromptOrThrow, getStudyOrThrow } from "@/lib/study";
import { useStageTelemetry } from "@/lib/telemetry";
import type { RecallPrompt } from "@/lib/types";
import { useStudySessionBundle } from "@/components/use-study-session-bundle";

interface RecallRecognitionClientProps {
  studySlug: string;
  promptIndex: number;
}

type Step = "recall" | "recognition";

const telemetryEnabled = process.env.NEXT_PUBLIC_ENABLE_TELEMETRY === "true";

export function RecallRecognitionClient({ studySlug, promptIndex }: RecallRecognitionClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
  const instructionText = snapshot.instructionText as typeof import("@/content/instruction-text").instructionText;
  const { sessionId, bundle, error: sessionError } = useStudySessionBundle({
    studySlug,
    stage: "recall",
    loadErrorMessage: appText.study.recall.loadError,
    stageErrorMessage: appText.study.recall.loadError
  });
  const [prompt, setPrompt] = useState<RecallPrompt | null>(null);
  const [actualPromptIndex, setActualPromptIndex] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("recall");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [firstKeyAt, setFirstKeyAt] = useState<number | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [pasteCount, setPasteCount] = useState(0);
  const [recognitionStartedAt, setRecognitionStartedAt] = useState<number | null>(null);
  const study = getStudyOrThrow(studySlug);

  useStageTelemetry(sessionId, "recall");

  useEffect(() => {
    const isDevJump = searchParams.get("devJump") === "1";
    if (!bundle) {
      return;
    }

    const order = bundle.session.recallPromptOrder.length > 0 ? bundle.session.recallPromptOrder : study.recallPrompts.map((entry) => entry.promptIndex);
    const orderedPromptIndex = order[promptIndex - 1];
    if (!orderedPromptIndex) {
      router.replace(buildStudyPathWithSession(studySlug, "matching", bundle.session.id));
      return;
    }

    setActualPromptIndex(orderedPromptIndex);
    setPrompt(getRecallPromptOrThrow(studySlug, orderedPromptIndex));

    const recallDone = bundle.recall.some((entry) => entry.promptIndex === orderedPromptIndex);
    const recognitionDone = bundle.recognition.some((entry) => entry.promptIndex === orderedPromptIndex);

    if (recallDone && recognitionDone && !isDevJump) {
      const nextPath =
        promptIndex >= study.recallPrompts.length
          ? buildStudyPathWithSession(studySlug, "matching", bundle.session.id)
          : buildStudyPathWithSession(studySlug, `recall/${promptIndex + 1}`, bundle.session.id);
      router.replace(nextPath);
      return;
    }

    setStep(isDevJump ? "recall" : recallDone ? "recognition" : "recall");
    setStartedAt(performance.now());
    setRecognitionStartedAt(!isDevJump && recallDone ? performance.now() : null);
  }, [bundle, promptIndex, router, searchParams, study.recallPrompts.length, studySlug]);

  function logRecallEvent(eventType: "paste" | "copy" | "cut" | "clipboard_shortcut" | "beforeinput_paste") {
    if (!telemetryEnabled || !sessionId || actualPromptIndex === null) {
      return;
    }

    void sendTelemetryRequest(sessionId, {
      stage: "recall",
      eventType,
      payload: {
        promptIndex: actualPromptIndex
      }
    });
  }

  function handleTextChange(value: string) {
    if (firstKeyAt === null && value.length > 0) {
      setFirstKeyAt(performance.now());
    }
    setEditCount((count) => count + 1);
    setText(value);
  }

  async function submitRecall() {
    if (!sessionId || !prompt || actualPromptIndex === null || startedAt === null) {
      return;
    }

    try {
      setIsPending(true);
      setError(null);
      await submitRecallRequest(sessionId, {
        promptIndex: actualPromptIndex,
        text,
        firstKeystrokeLatencyMs: firstKeyAt === null ? null : Math.max(1, Math.round(firstKeyAt - startedAt)),
        totalResponseTimeMs: Math.max(1, Math.round(performance.now() - startedAt)),
        editCount,
        pasted: pasteCount > 0,
        pasteCount
      });
      setStep("recognition");
      setRecognitionStartedAt(performance.now());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : appText.study.recall.saveRecallError);
    } finally {
      setIsPending(false);
    }
  }

  async function submitRecognition(optionIndex: number) {
    if (!sessionId || actualPromptIndex === null || recognitionStartedAt === null) {
      return;
    }

    try {
      setIsPending(true);
      setError(null);
      const responseTimeMs = Math.max(1, Math.round(performance.now() - recognitionStartedAt));
      const result = await submitRecognitionRequest(sessionId, actualPromptIndex, optionIndex, responseTimeMs);
      if (result.completed || promptIndex >= study.recallPrompts.length) {
        router.push(buildStudyPathWithSession(studySlug, "matching", sessionId));
        return;
      }
      router.push(buildStudyPathWithSession(studySlug, `recall/${promptIndex + 1}`, sessionId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : appText.study.recall.saveRecognitionError);
      setIsPending(false);
    }
  }

  if (sessionError || error) {
    return (
      <section className="panel error-card">
        <p className="status">{sessionError ?? error}</p>
      </section>
    );
  }

  if (!prompt) {
    return (
      <section className="panel">
        <p className="status">{appText.study.recall.loading}</p>
      </section>
    );
  }
  return (
    <section className="panel screen-panel study-stage-panel recall-panel">
      <EditableContentText
        contentKey="appText.study.recall.promptTextStyle"
        tag="div"
        className="recall-prompt"
        dir="ltr"
        dangerouslySetInnerHTML={{ __html: prompt.promptHtml }}
      />

      {step === "recall" ? (
        <section className="question-block">
          <label className="question-label instruction-bilingual" htmlFor="recall-answer">
            <BilingualInstructionText
              labelContentKey="instructionText.study.recall.recallInputLabel"
              englishContentKey="instructionText.study.recall.recallInputLabelEnglish"
              label={instructionText.study.recall.recallInputLabel}
              english={instructionText.study.recall.recallInputLabelEnglish}
            />
          </label>
          <input
            id="recall-answer"
            className="text-input"
            value={text}
            dir="ltr"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onBeforeInput={(event) => {
              if (event.nativeEvent.inputType === "insertFromPaste") {
                logRecallEvent("beforeinput_paste");
              }
            }}
            onChange={(event) => handleTextChange(event.target.value)}
            onCopy={() => logRecallEvent("copy")}
            onCut={() => logRecallEvent("cut")}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && ["c", "v", "x"].includes(event.key.toLowerCase())) {
                logRecallEvent("clipboard_shortcut");
              }
            }}
            onPaste={() => {
              setPasteCount((count) => count + 1);
              logRecallEvent("paste");
            }}
          />
          <div className="actions">
            <button type="button" className="button" onClick={submitRecall} disabled={isPending}>
              <EditableContentText contentKey="instructionText.study.recall.continueButton" tag="span">
                {instructionText.study.recall.continueButton}
              </EditableContentText>
            </button>
          </div>
        </section>
      ) : (
        <section className="question-block">
          <div className="question-label instruction-bilingual">
            <BilingualInstructionText
              labelContentKey="instructionText.study.recall.recognitionLabel"
              englishContentKey="instructionText.study.recall.recognitionLabelEnglish"
              label={instructionText.study.recall.recognitionLabel}
              english={instructionText.study.recall.recognitionLabelEnglish}
            />
          </div>
          <div className="option-grid">
            {prompt.recognitionOptions.map((option) => (
              <button
                key={option.optionIndex}
                type="button"
                className="button answer-button option-button"
                onClick={() => submitRecognition(option.optionIndex)}
                disabled={isPending}
              >
                {option.displayText}
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
