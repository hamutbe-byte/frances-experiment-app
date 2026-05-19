"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { formatContent } from "@/lib/content";
import type { NvltLevel, NvltQuestion } from "@/lib/nvlt";

interface NvltTestClientProps {
  levels: NvltLevel[];
}

interface FlatQuestion {
  levelId: string;
  question: NvltQuestion;
  sequenceNumber: number;
}

type AnswerMap = Record<string, number>;

const exampleQuestion = {
  words: ["game", "island", "mouth", "movie", "song", "yard"],
  prompts: [
    "land with water all around it",
    "part of your body used for eating and talking",
    "piece of music"
  ]
} as const;
const exampleAnswers = [2, 3, 5] as const;

function makeAnswerKey(levelId: string, questionOrder: number, promptIndex: number) {
  return `${levelId}:${questionOrder}:${promptIndex}`;
}

export function NvltTestClient({ levels }: NvltTestClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { snapshot } = useResolvedContent();
  const appText = snapshot.appText as typeof import("@/content/app-text").appText;
  const instructionText = snapshot.instructionText as typeof import("@/content/instruction-text").instructionText;
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});

  const questions = useMemo<FlatQuestion[]>(() => {
    let sequenceNumber = 0;
    return levels.flatMap((level) =>
      level.questions.map((question) => ({
        levelId: level.id,
        question,
        sequenceNumber: (sequenceNumber += 1)
      }))
    );
  }, [levels]);

  const activeEntry = questions[questionIndex] ?? null;

  if (!activeEntry) {
    return (
      <section className="panel">
        <p className="status">{appText.nvlt.emptyState}</p>
      </section>
    );
  }

  const { levelId, question: activeQuestion, sequenceNumber } = activeEntry;
  const nextPath = searchParams.get("next");
  const isLastQuestion = questionIndex >= questions.length - 1;

  function updateAssignment(promptIndex: number, nextWordIndex: number | null) {
    setAnswers((current) => {
      const next = { ...current };

      activeQuestion.prompts.forEach((_, index) => {
        const key = makeAnswerKey(levelId, activeQuestion.order, index);
        if (nextWordIndex !== null && next[key] === nextWordIndex) {
          delete next[key];
        }
      });

      const targetKey = makeAnswerKey(levelId, activeQuestion.order, promptIndex);
      if (nextWordIndex === null) {
        delete next[targetKey];
      } else {
        next[targetKey] = nextWordIndex;
      }

      return next;
    });
  }

  return (
    <section className="stack">
      {questionIndex === 0 ? (
        <div className="panel nvlt-sheet-panel nvlt-example-panel">
          <section className="nvlt-example" aria-label={instructionText.nvlt.exampleTitle}>
            <div className="nvlt-example-header">
              <strong>{instructionText.nvlt.exampleTitle}</strong>
              <p>{instructionText.nvlt.exampleSubtitle}</p>
            </div>

            <div className="nvlt-sheet">
              <div className="nvlt-worksheet">
                <div className="nvlt-word-bank" aria-label={instructionText.nvlt.wordBankAriaLabel}>
                  {exampleQuestion.words.map((word, index) => (
                    <div key={`example-word-${word}`} className="nvlt-word-chip">
                      <span className="nvlt-word-number">{index + 1}.</span>
                      <span>{word}</span>
                    </div>
                  ))}
                </div>

                <div className="nvlt-prompt-list">
                  {exampleQuestion.prompts.map((prompt, promptIndex) => (
                    <div key={`example-prompt-${prompt}`} className="nvlt-prompt-row">
                      <div className="nvlt-select-wrap">
                        <div className="nvlt-number-input nvlt-number-input-readonly" aria-label={instructionText.nvlt.exampleAnswerLabel}>
                          {exampleAnswers[promptIndex]}
                        </div>
                      </div>
                      <p className="nvlt-prompt-text">{prompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <div className="panel nvlt-sheet-panel screen-panel">
        <div className="trial-header">
          <strong className="nvlt-page-title">{formatContent(appText.nvlt.progressTitle, { current: sequenceNumber, total: questions.length })}</strong>
        </div>

        <div className="nvlt-sheet nvlt-drag-sheet" dir="ltr">
          <div className="nvlt-worksheet">
            <div className="nvlt-word-bank" aria-label={instructionText.nvlt.wordBankAriaLabel}>
              {activeQuestion.words.map((word, wordIndex) => (
                <div key={word} className="nvlt-word-chip">
                  <span className="nvlt-word-number">{wordIndex + 1}.</span>
                  <span>{word}</span>
                </div>
              ))}
            </div>

            <div className="nvlt-prompt-list">
              {activeQuestion.prompts.map((prompt, promptIndex) => {
                const selectedWordIndex = answers[makeAnswerKey(levelId, activeQuestion.order, promptIndex)];
                const inputValue = selectedWordIndex === undefined ? "" : String(selectedWordIndex + 1);

                return (
                  <div key={`${activeQuestion.order}-${promptIndex}`} className="nvlt-prompt-row">
                    <label className="nvlt-select-wrap">
                      <span className="sr-only">{formatContent(instructionText.nvlt.inputSrLabel, { prompt })}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={String(activeQuestion.words.length).length}
                        className="nvlt-number-input"
                        value={inputValue}
                        onChange={(event) => {
                          const value = event.target.value.replace(/\D/g, "");
                          if (value === "") {
                            updateAssignment(promptIndex, null);
                            return;
                          }

                          const numericValue = Number(value);
                          if (numericValue >= 1 && numericValue <= activeQuestion.words.length) {
                            updateAssignment(promptIndex, numericValue - 1);
                          }
                        }}
                        aria-label={formatContent(instructionText.nvlt.inputAriaLabel, { prompt })}
                      />
                    </label>
                    <p className="nvlt-prompt-text">{prompt}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="actions nvlt-page-controls nvlt-bottom-controls">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setQuestionIndex((current) => Math.max(0, current - 1))}
            disabled={questionIndex === 0}
          >
            {appText.nvlt.previousButton}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              if (isLastQuestion) {
                if (nextPath) {
                  router.push(nextPath);
                }
                return;
              }

              setQuestionIndex((current) => Math.min(questions.length - 1, current + 1));
            }}
            disabled={isLastQuestion && !nextPath}
          >
            {isLastQuestion
              ? nextPath
                ? appText.nvlt.continueToExperimentButton
                : appText.nvlt.finishButton
              : appText.nvlt.nextButton}
          </button>
        </div>
      </div>
    </section>
  );
}
