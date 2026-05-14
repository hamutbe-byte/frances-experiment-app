"use client";

import { useMemo, useState } from "react";

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

function makeAnswerKey(levelId: string, questionOrder: number, promptIndex: number) {
  return `${levelId}:${questionOrder}:${promptIndex}`;
}

export function NvltTestClient({ levels }: NvltTestClientProps) {
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
        <p className="status">No NVLT levels are currently enabled.</p>
      </section>
    );
  }

  const { levelId, question: activeQuestion, sequenceNumber } = activeEntry;

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
      <div className="panel nvlt-sheet-panel">
        <div className="trial-header">
          <strong className="nvlt-page-title">
            Question {sequenceNumber} of {questions.length}
          </strong>
          <div className="nvlt-page-controls">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setQuestionIndex((current) => Math.max(0, current - 1))}
              disabled={questionIndex === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setQuestionIndex((current) => Math.min(questions.length - 1, current + 1))}
              disabled={questionIndex >= questions.length - 1}
            >
              Next
            </button>
          </div>
        </div>

        <div className="nvlt-sheet nvlt-drag-sheet" dir="ltr">
          <div className="nvlt-sheet-header">
            <h2>({sequenceNumber})</h2>
            <p>Choose the number of the word that matches each meaning.</p>
          </div>

          <div className="nvlt-worksheet">
            <div className="nvlt-word-bank" aria-label="Available words">
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
                      <span className="sr-only">Write word number for {prompt}</span>
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
                        aria-label={`Write word number for ${prompt}`}
                        placeholder="#"
                      />
                    </label>
                    <p className="nvlt-prompt-text">{prompt}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
