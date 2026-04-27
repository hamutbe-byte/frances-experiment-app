import fs from "node:fs";
import path from "node:path";

import { makeCompletionCode, makeSessionId, chooseBalancedVersion } from "@/lib/assignment";
import { getLearningTrialCount, getLearningTrialOrThrow, getRecallPromptOrThrow, getStudyOrThrow } from "@/lib/study";
import type {
  ClientEvent,
  ComprehensionResponse,
  CreateSessionInput,
  CreateSessionResult,
  ParticipantSession,
  RecallItemResponse,
  RecognitionResponse,
  SessionBundle,
  SessionStage,
  YesNoAnswer
} from "@/lib/types";

interface ComprehensionInput {
  trialIndex: number;
  answer: YesNoAnswer;
  responseTimeMs: number;
}

interface RecallInput {
  promptIndex: number;
  text: string;
  firstKeystrokeLatencyMs: number | null;
  totalResponseTimeMs: number;
  editCount: number;
  pasted: boolean;
  pasteCount: number;
}

interface RecognitionInput {
  promptIndex: number;
  selectedOptionIndex: number;
  responseTimeMs: number;
}

interface StoreFile {
  bundles: SessionBundle[];
}

function getRuntimeDir() {
  return process.env.FRANCES_STORE_DIR ?? path.join(process.cwd(), ".runtime");
}

function getStorePath() {
  return path.join(getRuntimeDir(), "session-store.json");
}

function ensureStoreFile() {
  const runtimeDir = getRuntimeDir();
  const storePath = getStorePath();
  fs.mkdirSync(runtimeDir, { recursive: true });
  if (!fs.existsSync(storePath)) {
    const initial: StoreFile = { bundles: [] };
    fs.writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

function readStore(): StoreFile {
  const storePath = getStorePath();
  ensureStoreFile();
  const raw = fs.readFileSync(storePath, "utf8");
  const store = JSON.parse(raw) as StoreFile;
  for (const bundle of store.bundles) {
    bundle.comprehension ??= [];
    bundle.recall ??= [];
    bundle.recognition ??= [];
    bundle.matching ??= [];
    bundle.telemetry ??= [];
  }
  return store;
}

function writeStore(store: StoreFile) {
  const storePath = getStorePath();
  ensureStoreFile();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function cloneBundle(bundle: SessionBundle): SessionBundle {
  return JSON.parse(JSON.stringify(bundle)) as SessionBundle;
}

function updateBundle(sessionId: string, updater: (bundle: SessionBundle) => void) {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  updater(bundle);
  writeStore(store);
  return cloneBundle(bundle);
}

export function createSession(input: CreateSessionInput): CreateSessionResult {
  const store = readStore();
  const study = getStudyOrThrow(input.studySlug);
  const sessions = store.bundles.map((bundle) => bundle.session);
  const version = chooseBalancedVersion(study, sessions);
  const sessionId = makeSessionId();
  const timestamp = nowIso();

  const session: ParticipantSession = {
    id: sessionId,
    studySlug: study.slug,
    versionId: version.id,
    versionNumber: version.versionNumber,
    status: "created",
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    completionCode: makeCompletionCode(sessionId),
    device: input.device
  };

  const bundle: SessionBundle = {
    session,
    comprehension: [],
    recall: [],
    recognition: [],
    matching: [],
    telemetry: []
  };

  store.bundles.push(bundle);
  writeStore(store);

  return {
    session: cloneBundle(bundle).session,
    nextPath: `/study/${study.slug}/instructions?session=${sessionId}`
  };
}

export function getSessionBundle(sessionId: string): SessionBundle | null {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  return bundle ? cloneBundle(bundle) : null;
}

export function updateSessionStatus(sessionId: string, status: SessionStage) {
  return updateBundle(sessionId, (bundle) => {
    bundle.session.status = status;
    bundle.session.updatedAt = nowIso();
    if (status === "complete") {
      bundle.session.completedAt = bundle.session.updatedAt;
    }
  });
}

export function appendTelemetry(sessionId: string, event: Omit<ClientEvent, "createdAt" | "sessionId">) {
  return updateBundle(sessionId, (bundle) => {
    bundle.telemetry.push({
      sessionId,
      createdAt: nowIso(),
      ...event
    });
    bundle.session.updatedAt = nowIso();
  });
}

export function saveComprehensionResponse(sessionId: string, input: ComprehensionInput) {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const study = getStudyOrThrow(bundle.session.studySlug);
  const trial = getLearningTrialOrThrow(study.slug, bundle.session.versionId, input.trialIndex);
  const trialCount = getLearningTrialCount(study.slug, bundle.session.versionId);
  const existing = bundle.comprehension.find((entry) => entry.trialIndex === input.trialIndex);

  if (existing) {
    return {
      bundle: cloneBundle(bundle),
      response: existing,
      nextTrialIndex: existing.trialIndex + 1,
      completed: existing.trialIndex >= trialCount
    };
  }

  const response: ComprehensionResponse = {
    sessionId,
    studySlug: bundle.session.studySlug,
    versionId: bundle.session.versionId,
    trialIndex: input.trialIndex,
    answer: input.answer,
    correct: trial.correctAnswer === input.answer,
    responseTimeMs: input.responseTimeMs,
    answeredAt: nowIso()
  };

  bundle.comprehension.push(response);
  bundle.session.status = input.trialIndex >= trialCount ? "distractor" : "learning";
  bundle.session.updatedAt = nowIso();

  writeStore(store);

  return {
    bundle: cloneBundle(bundle),
    response,
    nextTrialIndex: input.trialIndex + 1,
    completed: input.trialIndex >= trialCount
  };
}

export function saveRecallResponse(sessionId: string, input: RecallInput) {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const prompt = getRecallPromptOrThrow(bundle.session.studySlug, input.promptIndex);
  const existing = bundle.recall.find((entry) => entry.promptIndex === input.promptIndex);

  if (existing) {
    return {
      bundle: cloneBundle(bundle),
      response: existing
    };
  }

  const text = input.text.trim();
  const response: RecallItemResponse = {
    sessionId,
    promptIndex: input.promptIndex,
    pseudoword: prompt.pseudoword,
    text,
    firstKeystrokeLatencyMs: input.firstKeystrokeLatencyMs,
    totalResponseTimeMs: input.totalResponseTimeMs,
    editCount: input.editCount,
    isEmpty: text.length === 0,
    pasted: input.pasted,
    pasteCount: input.pasteCount,
    submittedAt: nowIso()
  };

  bundle.recall.push(response);
  bundle.session.status = "recall";
  bundle.session.updatedAt = nowIso();
  writeStore(store);

  return {
    bundle: cloneBundle(bundle),
    response
  };
}

export function saveRecognitionResponse(sessionId: string, input: RecognitionInput) {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const study = getStudyOrThrow(bundle.session.studySlug);
  const prompt = getRecallPromptOrThrow(study.slug, input.promptIndex);
  const option = prompt.recognitionOptions.find((entry) => entry.optionIndex === input.selectedOptionIndex);
  if (!option) {
    throw new Error(`Recognition option ${input.selectedOptionIndex} was not found.`);
  }

  const existing = bundle.recognition.find((entry) => entry.promptIndex === input.promptIndex);
  if (existing) {
    return {
      bundle: cloneBundle(bundle),
      response: existing,
      nextPromptIndex: existing.promptIndex + 1,
      completed: existing.promptIndex >= study.recallPrompts.length
    };
  }

  const response: RecognitionResponse = {
    sessionId,
    promptIndex: input.promptIndex,
    pseudoword: prompt.pseudoword,
    selectedOptionIndex: input.selectedOptionIndex,
    selectedOptionText: option.text,
    correct: option.isCorrect,
    responseTimeMs: input.responseTimeMs,
    answeredAt: nowIso()
  };

  bundle.recognition.push(response);
  bundle.session.status = input.promptIndex >= study.recallPrompts.length ? "matching" : "recall";
  bundle.session.updatedAt = nowIso();
  writeStore(store);

  return {
    bundle: cloneBundle(bundle),
    response,
    nextPromptIndex: input.promptIndex + 1,
    completed: input.promptIndex >= study.recallPrompts.length
  };
}

export function __resetStoreForTests() {
  const runtimeDir = getRuntimeDir();
  const storePath = getStorePath();
  if (fs.existsSync(storePath)) {
    fs.rmSync(storePath, { force: true });
  }
  if (fs.existsSync(runtimeDir)) {
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  }
}
