import fs from "node:fs";
import path from "node:path";

import { makeCompletionCode, makeParticipantOrders, makeSessionId, chooseBalancedVersion } from "@/lib/assignment";
import {
  getLearningTrialCount,
  getLearningTrialOrThrow,
  getMatchingTrialCount,
  getMatchingTrialOrThrow,
  getRecallPromptOrThrow,
  getStudyOrThrow
} from "@/lib/study";
import { buildStudyPathWithSession } from "@/lib/study-paths";
import type {
  ClientEvent,
  ComprehensionResponse,
  CreateSessionInput,
  CreateSessionResult,
  DistractorResponse,
  MatchingResponse,
  MatchingAnswer,
  ParticipantLanguageProfileInput,
  ParticipantQuestionnaire,
  ParticipantQuestionnaireInput,
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

interface DistractorInput {
  trialIndex: number;
  direction: "forward" | "backward";
  sequenceLength: number;
  shownSequence: number[];
  responseSequence: number[];
  responseTimeMs: number;
}

interface RecognitionInput {
  promptIndex: number;
  selectedOptionIndex: number;
  responseTimeMs: number;
}

interface MatchingInput {
  trialIndex: number;
  answer: MatchingAnswer;
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
    bundle.questionnaire ??= null;
    bundle.comprehension ??= [];
    bundle.distractor ??= [];
    bundle.recall ??= [];
    bundle.recognition ??= [];
    bundle.matching ??= [];
    bundle.telemetry ??= [];
    const study = getStudyOrThrow(bundle.session.studySlug);
    bundle.session.recallPromptOrder ??= study.recallPrompts.map((prompt) => prompt.promptIndex);
    bundle.session.matchingTrialOrder ??= study.matchingTrials.map((trial) => trial.trialIndex);
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

function normaliseText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normaliseBoolean(value: boolean | null | undefined) {
  return value === true;
}

function normalisePercentageEntry(input: { language: string; percentage: string }) {
  return {
    language: normaliseText(input.language),
    percentage: normaliseText(input.percentage)
  };
}

function normaliseCultureEntry(input: { culture: string; identificationLevel: number | null }) {
  return {
    culture: normaliseText(input.culture),
    identificationLevel: normaliseNumber(input.identificationLevel)
  };
}

function normaliseLanguageProfile(input: ParticipantLanguageProfileInput): ParticipantLanguageProfileInput {
  return {
    language: normaliseText(input.language),
    languageStatus: normaliseText(input.languageStatus),
    ageBeganAcquiring: normaliseNumber(input.ageBeganAcquiring),
    ageBecameFluent: normaliseNumber(input.ageBecameFluent),
    ageBeganReading: normaliseNumber(input.ageBeganReading),
    ageBecameFluentReading: normaliseNumber(input.ageBecameFluentReading),
    countryYears: normaliseNumber(input.countryYears),
    countryMonths: normaliseNumber(input.countryMonths),
    familyYears: normaliseNumber(input.familyYears),
    familyMonths: normaliseNumber(input.familyMonths),
    schoolWorkYears: normaliseNumber(input.schoolWorkYears),
    schoolWorkMonths: normaliseNumber(input.schoolWorkMonths),
    speakingProficiency: normaliseNumber(input.speakingProficiency),
    understandingSpokenLanguageProficiency: normaliseNumber(input.understandingSpokenLanguageProficiency),
    readingProficiency: normaliseNumber(input.readingProficiency),
    learningByFriends: normaliseNumber(input.learningByFriends),
    learningByFamily: normaliseNumber(input.learningByFamily),
    learningByReading: normaliseNumber(input.learningByReading),
    learningByLanguageTapesSelfInstruction: normaliseNumber(input.learningByLanguageTapesSelfInstruction),
    learningByWatchingTv: normaliseNumber(input.learningByWatchingTv),
    learningByListeningToRadio: normaliseNumber(input.learningByListeningToRadio),
    exposureToFriends: normaliseNumber(input.exposureToFriends),
    exposureToFamily: normaliseNumber(input.exposureToFamily),
    exposureToWatchingTv: normaliseNumber(input.exposureToWatchingTv),
    exposureToRadioMusic: normaliseNumber(input.exposureToRadioMusic),
    exposureToReading: normaliseNumber(input.exposureToReading),
    exposureToLanguageLabSelfInstruction: normaliseNumber(input.exposureToLanguageLabSelfInstruction),
    foreignAccent: normaliseNumber(input.foreignAccent),
    nonNativeIdentificationByAccent: normaliseNumber(input.nonNativeIdentificationByAccent)
  };
}

function hasLanguageProfileContent(profile: ParticipantLanguageProfileInput) {
  return Boolean(
    profile.language ||
      profile.languageStatus ||
      profile.ageBeganAcquiring !== null ||
      profile.ageBecameFluent !== null ||
      profile.ageBeganReading !== null ||
      profile.ageBecameFluentReading !== null ||
      profile.countryYears !== null ||
      profile.countryMonths !== null ||
      profile.familyYears !== null ||
      profile.familyMonths !== null ||
      profile.schoolWorkYears !== null ||
      profile.schoolWorkMonths !== null ||
      profile.speakingProficiency !== null ||
      profile.understandingSpokenLanguageProficiency !== null ||
      profile.readingProficiency !== null ||
      profile.learningByFriends !== null ||
      profile.learningByFamily !== null ||
      profile.learningByReading !== null ||
      profile.learningByLanguageTapesSelfInstruction !== null ||
      profile.learningByWatchingTv !== null ||
      profile.learningByListeningToRadio !== null ||
      profile.exposureToFriends !== null ||
      profile.exposureToFamily !== null ||
      profile.exposureToWatchingTv !== null ||
      profile.exposureToRadioMusic !== null ||
      profile.exposureToReading !== null ||
      profile.exposureToLanguageLabSelfInstruction !== null ||
      profile.foreignAccent !== null ||
      profile.nonNativeIdentificationByAccent !== null
  );
}

function normaliseQuestionnaire(input?: ParticipantQuestionnaireInput | null): ParticipantQuestionnaire | null {
  if (!input) {
    return null;
  }

  const questionnaire: ParticipantQuestionnaire = {
    lastName: normaliseText(input.lastName),
    firstName: normaliseText(input.firstName),
    todayDate: normaliseText(input.todayDate),
    age: normaliseNumber(input.age),
    dateOfBirth: normaliseText(input.dateOfBirth),
    gender: normaliseText(input.gender),
    languagesByDominance: (input.languagesByDominance ?? []).map((entry) => normaliseText(entry)),
    languagesByAcquisition: (input.languagesByAcquisition ?? []).map((entry) => normaliseText(entry)),
    currentExposure: (input.currentExposure ?? []).map(normalisePercentageEntry),
    readingPreference: (input.readingPreference ?? []).map(normalisePercentageEntry),
    speakingPreference: (input.speakingPreference ?? []).map(normalisePercentageEntry),
    cultures: (input.cultures ?? []).map(normaliseCultureEntry),
    yearsOfEducation: normaliseNumber(input.yearsOfEducation),
    educationLevel: normaliseText(input.educationLevel),
    educationLevelOther: normaliseText(input.educationLevelOther),
    usaImmigrationDate: normaliseText(input.usaImmigrationDate),
    otherImmigrationDetails: normaliseText(input.otherImmigrationDetails),
    hasVisionProblem: normaliseBoolean(input.hasVisionProblem),
    hasHearingImpairment: normaliseBoolean(input.hasHearingImpairment),
    hasLanguageDisability: normaliseBoolean(input.hasLanguageDisability),
    hasLearningDisability: normaliseBoolean(input.hasLearningDisability),
    disabilityExplanation: normaliseText(input.disabilityExplanation),
    languageProfiles: (input.languageProfiles ?? []).map(normaliseLanguageProfile),
    submittedAt: nowIso()
  };

  const hasContent = Boolean(
    questionnaire.lastName ||
      questionnaire.firstName ||
      questionnaire.todayDate ||
    questionnaire.age !== null ||
      questionnaire.dateOfBirth ||
      questionnaire.gender ||
      questionnaire.languagesByDominance.some(Boolean) ||
      questionnaire.languagesByAcquisition.some(Boolean) ||
      questionnaire.currentExposure.some((entry) => entry.language || entry.percentage) ||
      questionnaire.readingPreference.some((entry) => entry.language || entry.percentage) ||
      questionnaire.speakingPreference.some((entry) => entry.language || entry.percentage) ||
      questionnaire.cultures.some((entry) => entry.culture || entry.identificationLevel !== null) ||
      questionnaire.yearsOfEducation !== null ||
      questionnaire.educationLevel ||
      questionnaire.educationLevelOther ||
      questionnaire.usaImmigrationDate ||
      questionnaire.otherImmigrationDetails ||
      questionnaire.hasVisionProblem ||
      questionnaire.hasHearingImpairment ||
      questionnaire.hasLanguageDisability ||
      questionnaire.hasLearningDisability ||
      questionnaire.disabilityExplanation ||
      questionnaire.languageProfiles.some(hasLanguageProfileContent)
  );

  return hasContent ? questionnaire : null;
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
  const participantOrders = makeParticipantOrders(study, sessionId);
  const timestamp = nowIso();

  const session: ParticipantSession = {
    id: sessionId,
    studySlug: study.slug,
    versionId: version.id,
    versionNumber: version.versionNumber,
    recallPromptOrder: participantOrders.recallPromptOrder,
    matchingTrialOrder: participantOrders.matchingTrialOrder,
    status: "created",
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    completionCode: makeCompletionCode(sessionId),
    device: input.device
  };

  const bundle: SessionBundle = {
    session,
    questionnaire: normaliseQuestionnaire(input.questionnaire),
    comprehension: [],
    distractor: [],
    recall: [],
    recognition: [],
    matching: [],
    telemetry: []
  };

  store.bundles.push(bundle);
  writeStore(store);

  return {
    session: cloneBundle(bundle).session,
    nextPath: buildStudyPathWithSession(study.slug, "learn/1", sessionId)
  };
}

export function getSessionBundle(sessionId: string): SessionBundle | null {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  return bundle ? cloneBundle(bundle) : null;
}

export function listSessionBundles(): SessionBundle[] {
  const store = readStore();
  return store.bundles.map(cloneBundle).sort((left, right) => right.session.createdAt.localeCompare(left.session.createdAt));
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

export function saveDistractorResponse(sessionId: string, input: DistractorInput) {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const existing = bundle.distractor.find((entry) => entry.trialIndex === input.trialIndex);
  if (existing) {
    return {
      bundle: cloneBundle(bundle),
      response: existing
    };
  }

  const response: DistractorResponse = {
    sessionId,
    trialIndex: input.trialIndex,
    direction: input.direction,
    sequenceLength: input.sequenceLength,
    shownSequence: input.shownSequence,
    responseSequence: input.responseSequence,
    correct:
      input.shownSequence.length === input.responseSequence.length &&
      input.shownSequence.every((value, index) => value === input.responseSequence[index]),
    responseTimeMs: input.responseTimeMs,
    answeredAt: nowIso()
  };

  bundle.distractor.push(response);
  bundle.session.status = "distractor";
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
    const answeredPromptIndexes = new Set(bundle.recognition.map((entry) => entry.promptIndex));
    return {
      bundle: cloneBundle(bundle),
      response: existing,
      nextPromptIndex: existing.promptIndex + 1,
      completed: answeredPromptIndexes.size >= study.recallPrompts.length
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
  const answeredPromptIndexes = new Set(bundle.recognition.map((entry) => entry.promptIndex));
  const completed = answeredPromptIndexes.size >= study.recallPrompts.length;
  bundle.session.status = completed ? "matching" : "recall";
  bundle.session.updatedAt = nowIso();
  writeStore(store);

  return {
    bundle: cloneBundle(bundle),
    response,
    nextPromptIndex: input.promptIndex + 1,
    completed
  };
}

export function saveMatchingResponse(sessionId: string, input: MatchingInput) {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const trial = getMatchingTrialOrThrow(bundle.session.studySlug, input.trialIndex);
  const trialCount = getMatchingTrialCount(bundle.session.studySlug);
  const existing = bundle.matching.find((entry) => entry.trialIndex === input.trialIndex);

  if (existing) {
    const answeredTrialIndexes = new Set(bundle.matching.map((entry) => entry.trialIndex));
    const nextTrialIndex = bundle.session.matchingTrialOrder.find((trialIndex) => !answeredTrialIndexes.has(trialIndex)) ?? trialCount + 1;
    return {
      bundle: cloneBundle(bundle),
      response: existing,
      nextTrialIndex,
      completed: answeredTrialIndexes.size >= trialCount
    };
  }

  const response: MatchingResponse = {
    sessionId,
    trialIndex: input.trialIndex,
    pictureId: trial.pictureId,
    condition: trial.condition,
    answer: input.answer,
    correct: trial.correctAnswer === input.answer,
    responseTimeMs: input.responseTimeMs,
    answeredAt: nowIso()
  };

  bundle.matching.push(response);
  const answeredTrialIndexes = new Set(bundle.matching.map((entry) => entry.trialIndex));
  const completed = answeredTrialIndexes.size >= trialCount;
  const nextTrialIndex = bundle.session.matchingTrialOrder.find((trialIndex) => !answeredTrialIndexes.has(trialIndex)) ?? trialCount + 1;
  bundle.session.status = completed ? "complete" : "matching";
  bundle.session.updatedAt = nowIso();
  if (completed) {
    bundle.session.completedAt = bundle.session.updatedAt;
  }

  writeStore(store);

  return {
    bundle: cloneBundle(bundle),
    response,
    nextTrialIndex,
    completed
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
