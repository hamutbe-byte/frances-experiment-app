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
import { appendQueryParams, buildStudyPath, buildStudyPathWithSession } from "@/lib/study-paths";

export { appendQueryParams, buildStudyPath, buildStudyPathWithSession };

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

const sessionBundleCachePrefix = "frances-session-bundle";

function getBundleCacheKey(studySlug: string, sessionId: string) {
  return `${sessionBundleCachePrefix}:${studySlug}:${sessionId}`;
}

function readCachedSessionBundle<T>(studySlug: string, sessionId: string) {
  if (typeof window === "undefined") {
    return null as T | null;
  }

  const raw = window.sessionStorage.getItem(getBundleCacheKey(studySlug, sessionId));
  if (!raw) {
    return null as T | null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null as T | null;
  }
}

function writeCachedSessionBundle<T>(studySlug: string, sessionId: string, bundle: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getBundleCacheKey(studySlug, sessionId), JSON.stringify(bundle));
  } catch {
    // Ignore cache write failures. The network path still works.
  }
}

export function getCachedSessionBundle<T>(studySlug: string, sessionId: string) {
  return readCachedSessionBundle<T>(studySlug, sessionId);
}

export function cacheSessionBundle<T>(studySlug: string, sessionId: string, bundle: T) {
  writeCachedSessionBundle(studySlug, sessionId, bundle);
}

export function updateCachedSessionBundle<T>(studySlug: string, sessionId: string, updater: (bundle: T) => T) {
  const current = readCachedSessionBundle<T>(studySlug, sessionId);
  if (!current) {
    return null;
  }

  const next = updater(current);
  writeCachedSessionBundle(studySlug, sessionId, next);
  return next;
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
  const bundle = await readJson<SessionBundle>(await fetch(`/api/session/${sessionId}`, { cache: "no-store" }));
  cacheSessionBundle(bundle.session.studySlug, sessionId, bundle);
  return bundle;
}

export async function updateSessionStatusRequest(sessionId: string, status: SessionStage) {
  const bundle = await readJson<SessionBundle>(
    await fetch(`/api/session/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    })
  );
  cacheSessionBundle(bundle.session.studySlug, sessionId, bundle);
  return bundle;
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
  return appendQueryParams(path, { session: sessionId });
}

export function getResolvedStudySessionId(studySlug: string, searchParams: { get(name: string): string | null }) {
  return searchParams.get("session") ?? getCurrentSessionId(studySlug);
}

export function saveCurrentSessionId(studySlug: string, sessionId: string) {
  window.localStorage.setItem(`frances-session:${studySlug}`, sessionId);
}

export function getCurrentSessionId(studySlug: string) {
  return window.localStorage.getItem(`frances-session:${studySlug}`);
}
