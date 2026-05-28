"use client";

import type {
  ClientEvent,
  CreateSessionResult,
  DeviceSnapshot,
  DistractorDirection,
  MatchingAnswer,
  ParticipantQuestionnaireInput,
  RecallItemResponse,
  SessionBundle,
  SessionStage,
  YesNoAnswer
} from "@/lib/types";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function createSessionRequest(studySlug: string, device: DeviceSnapshot, questionnaire?: ParticipantQuestionnaireInput | null) {
  return readJson<CreateSessionResult>(
    await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ studySlug, device, questionnaire })
    })
  );
}

export async function getSessionBundleRequest(sessionId: string) {
  return readJson<SessionBundle>(await fetch(`/api/session/${sessionId}`, { cache: "no-store" }));
}

export async function updateSessionStatusRequest(sessionId: string, status: SessionStage) {
  return readJson<SessionBundle>(
    await fetch(`/api/session/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    })
  );
}

export async function submitComprehensionRequest(
  sessionId: string,
  trialIndex: number,
  answer: YesNoAnswer,
  responseTimeMs: number
) {
  return readJson<{ nextTrialIndex: number; completed: boolean }>(
    await fetch(`/api/session/${sessionId}/comprehension`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        trialIndex,
        answer,
        responseTimeMs
      })
    })
  );
}

export async function submitRecallRequest(
  sessionId: string,
  payload: {
    promptIndex: number;
    text: string;
    firstKeystrokeLatencyMs: number | null;
    totalResponseTimeMs: number;
    editCount: number;
    pasted: boolean;
    pasteCount: number;
  }
) {
  return readJson<{ response: RecallItemResponse }>(
    await fetch(`/api/session/${sessionId}/recall`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function submitDistractorRequest(
  sessionId: string,
  payload: {
    trialIndex: number;
    direction: DistractorDirection;
    sequenceLength: number;
    shownSequence: number[];
    responseSequence: number[];
    responseTimeMs: number;
  }
) {
  return readJson<{ correct: boolean }>(
    await fetch(`/api/session/${sessionId}/distractor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function submitRecognitionRequest(
  sessionId: string,
  promptIndex: number,
  selectedOptionIndex: number,
  responseTimeMs: number
) {
  return readJson<{ nextPromptIndex: number; completed: boolean }>(
    await fetch(`/api/session/${sessionId}/recognition`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        promptIndex,
        selectedOptionIndex,
        responseTimeMs
      })
    })
  );
}

export async function submitMatchingRequest(
  sessionId: string,
  trialIndex: number,
  answer: MatchingAnswer,
  responseTimeMs: number
) {
  return readJson<{ nextTrialIndex: number; completed: boolean }>(
    await fetch(`/api/session/${sessionId}/matching`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        trialIndex,
        answer,
        responseTimeMs
      })
    })
  );
}

export async function sendTelemetryRequest(
  sessionId: string,
  event: Omit<ClientEvent, "createdAt" | "sessionId">
) {
  return readJson<{ ok: true }>(
    await fetch(`/api/session/${sessionId}/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    })
  );
}

export function appendSessionToPath(path: string, sessionId: string) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("session", sessionId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function saveCurrentSessionId(studySlug: string, sessionId: string) {
  window.localStorage.setItem(`frances-session:${studySlug}`, sessionId);
}

export function getCurrentSessionId(studySlug: string) {
  return window.localStorage.getItem(`frances-session:${studySlug}`);
}
