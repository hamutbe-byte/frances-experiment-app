"use client";

import type {
  ClientEvent,
  CreateSessionResult,
  DeviceSnapshot,
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

export async function createSessionRequest(studySlug: string, device: DeviceSnapshot) {
  return readJson<CreateSessionResult>(
    await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ studySlug, device })
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

export function saveCurrentSessionId(studySlug: string, sessionId: string) {
  window.localStorage.setItem(`frances-session:${studySlug}`, sessionId);
}

export function getCurrentSessionId(studySlug: string) {
  return window.localStorage.getItem(`frances-session:${studySlug}`);
}
