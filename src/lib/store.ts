import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

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

type StorageMode = "local" | "supabase";

interface SessionRow {
  id: string;
  study_slug: string;
  version_id: string;
  version_number: number;
  recall_prompt_order: number[];
  matching_trial_order: number[];
  status: SessionStage;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completion_code: string;
  device: SessionBundle["session"]["device"];
  questionnaire: ParticipantQuestionnaire | null;
}

interface ComprehensionRow {
  session_id: string;
  study_slug: string;
  version_id: string;
  trial_index: number;
  answer: YesNoAnswer;
  correct: boolean;
  response_time_ms: number;
  answered_at: string;
}

interface RecallRow {
  session_id: string;
  prompt_index: number;
  pseudoword: string;
  text: string;
  first_keystroke_latency_ms: number | null;
  total_response_time_ms: number;
  edit_count: number;
  is_empty: boolean;
  pasted: boolean;
  paste_count: number;
  submitted_at: string;
}

interface DistractorRow {
  session_id: string;
  trial_index: number;
  direction: "forward" | "backward";
  sequence_length: number;
  shown_sequence: number[];
  response_sequence: number[];
  correct: boolean;
  response_time_ms: number;
  answered_at: string;
}

interface RecognitionRow {
  session_id: string;
  prompt_index: number;
  pseudoword: string;
  selected_option_index: number;
  selected_option_text: string;
  correct: boolean;
  response_time_ms: number;
  answered_at: string;
}

interface MatchingRow {
  session_id: string;
  trial_index: number;
  picture_id: string;
  condition: string;
  answer: MatchingAnswer;
  correct: boolean;
  response_time_ms: number;
  answered_at: string;
}

interface TelemetryRow {
  session_id: string;
  stage: SessionStage;
  event_type: ClientEvent["eventType"];
  created_at: string;
  payload: Record<string, string | number | boolean | null>;
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

function getStorageMode(): StorageMode {
  const forcedMode = process.env.FRANCES_STORAGE_MODE?.trim();
  if (forcedMode === "local" || forcedMode === "supabase") {
    return forcedMode;
  }

  if (process.env.FRANCES_STORE_DIR?.trim()) {
    return "local";
  }

  if (process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return "supabase";
  }

  return "local";
}

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase storage is not configured.");
  }

  return createClient(process.env.SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
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

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
    academicEnglishPlacement: normaliseText(input.academicEnglishPlacement),
    englishCourseLevel: normaliseText(input.englishCourseLevel),
    countryOfBirth: normaliseText(input.countryOfBirth),
    ageAtImmigration: normaliseNumber(input.ageAtImmigration),
    immigrationCountry: normaliseText(input.immigrationCountry),
    immigrationYears: normaliseNumber(input.immigrationYears),
    educationLevel: normaliseText(input.educationLevel),
    educationLevelOther: normaliseText(input.educationLevelOther),
    usaImmigrationDate: normaliseText(input.usaImmigrationDate),
    otherImmigrationDetails: normaliseText(input.otherImmigrationDetails),
    hasVisionProblem: normaliseBoolean(input.hasVisionProblem),
    hasHearingImpairment: normaliseBoolean(input.hasHearingImpairment),
    hasLanguageDisability: normaliseBoolean(input.hasLanguageDisability),
    hasLearningDisability: normaliseBoolean(input.hasLearningDisability),
    disabilityExplanation: normaliseText(input.disabilityExplanation),
    languageProfiles: (input.languageProfiles ?? []).map(normaliseLanguageProfile).filter(hasLanguageProfileContent),
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
      questionnaire.academicEnglishPlacement ||
      questionnaire.englishCourseLevel ||
      questionnaire.countryOfBirth ||
      questionnaire.ageAtImmigration !== null ||
      questionnaire.immigrationCountry ||
      questionnaire.immigrationYears !== null ||
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

function createSessionLocal(input: CreateSessionInput): CreateSessionResult {
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

function getSessionBundleLocal(sessionId: string): SessionBundle | null {
  const store = readStore();
  const bundle = store.bundles.find((entry) => entry.session.id === sessionId);
  return bundle ? cloneBundle(bundle) : null;
}

function listSessionBundlesLocal(): SessionBundle[] {
  const store = readStore();
  return store.bundles.map(cloneBundle).sort((left, right) => right.session.createdAt.localeCompare(left.session.createdAt));
}

function updateSessionStatusLocal(sessionId: string, status: SessionStage) {
  return updateBundle(sessionId, (bundle) => {
    bundle.session.status = status;
    bundle.session.updatedAt = nowIso();
    if (status === "complete") {
      bundle.session.completedAt = bundle.session.updatedAt;
    }
  });
}

function appendTelemetryLocal(sessionId: string, event: Omit<ClientEvent, "createdAt" | "sessionId">) {
  return updateBundle(sessionId, (bundle) => {
    bundle.telemetry.push({
      sessionId,
      createdAt: nowIso(),
      ...event
    });
    bundle.session.updatedAt = nowIso();
  });
}

function saveComprehensionResponseLocal(sessionId: string, input: ComprehensionInput) {
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

function saveRecallResponseLocal(sessionId: string, input: RecallInput) {
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

function saveDistractorResponseLocal(sessionId: string, input: DistractorInput) {
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

function saveRecognitionResponseLocal(sessionId: string, input: RecognitionInput) {
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

function saveMatchingResponseLocal(sessionId: string, input: MatchingInput) {
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

function resetStoreForTestsLocal() {
  const runtimeDir = getRuntimeDir();
  const storePath = getStorePath();
  if (fs.existsSync(storePath)) {
    fs.rmSync(storePath, { force: true });
  }
  if (fs.existsSync(runtimeDir)) {
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  }
}

function mapSessionRow(row: SessionRow): ParticipantSession {
  return {
    id: row.id,
    studySlug: row.study_slug,
    versionId: row.version_id,
    versionNumber: row.version_number,
    recallPromptOrder: [...row.recall_prompt_order],
    matchingTrialOrder: [...row.matching_trial_order],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    completionCode: row.completion_code,
    device: row.device
  };
}

function mapComprehensionRow(row: ComprehensionRow): ComprehensionResponse {
  return {
    sessionId: row.session_id,
    studySlug: row.study_slug,
    versionId: row.version_id,
    trialIndex: row.trial_index,
    answer: row.answer,
    correct: row.correct,
    responseTimeMs: row.response_time_ms,
    answeredAt: row.answered_at
  };
}

function mapRecallRow(row: RecallRow): RecallItemResponse {
  return {
    sessionId: row.session_id,
    promptIndex: row.prompt_index,
    pseudoword: row.pseudoword,
    text: row.text,
    firstKeystrokeLatencyMs: row.first_keystroke_latency_ms,
    totalResponseTimeMs: row.total_response_time_ms,
    editCount: row.edit_count,
    isEmpty: row.is_empty,
    pasted: row.pasted,
    pasteCount: row.paste_count,
    submittedAt: row.submitted_at
  };
}

function mapDistractorRow(row: DistractorRow): DistractorResponse {
  return {
    sessionId: row.session_id,
    trialIndex: row.trial_index,
    direction: row.direction,
    sequenceLength: row.sequence_length,
    shownSequence: [...row.shown_sequence],
    responseSequence: [...row.response_sequence],
    correct: row.correct,
    responseTimeMs: row.response_time_ms,
    answeredAt: row.answered_at
  };
}

function mapRecognitionRow(row: RecognitionRow): RecognitionResponse {
  return {
    sessionId: row.session_id,
    promptIndex: row.prompt_index,
    pseudoword: row.pseudoword,
    selectedOptionIndex: row.selected_option_index,
    selectedOptionText: row.selected_option_text,
    correct: row.correct,
    responseTimeMs: row.response_time_ms,
    answeredAt: row.answered_at
  };
}

function mapMatchingRow(row: MatchingRow): MatchingResponse {
  return {
    sessionId: row.session_id,
    trialIndex: row.trial_index,
    pictureId: row.picture_id,
    condition: row.condition as MatchingResponse["condition"],
    answer: row.answer,
    correct: row.correct,
    responseTimeMs: row.response_time_ms,
    answeredAt: row.answered_at
  };
}

function mapTelemetryRow(row: TelemetryRow): ClientEvent {
  return {
    sessionId: row.session_id,
    stage: row.stage,
    eventType: row.event_type,
    createdAt: row.created_at,
    payload: row.payload
  };
}

function composeBundleFromRows(
  sessionRow: SessionRow,
  questionnaire: ParticipantQuestionnaire | null,
  comprehensionRows: ComprehensionRow[],
  distractorRows: DistractorRow[],
  recallRows: RecallRow[],
  recognitionRows: RecognitionRow[],
  matchingRows: MatchingRow[],
  telemetryRows: TelemetryRow[]
): SessionBundle {
  return {
    session: mapSessionRow(sessionRow),
    questionnaire: questionnaire ? cloneValue(questionnaire) : null,
    comprehension: comprehensionRows.map(mapComprehensionRow),
    distractor: distractorRows.map(mapDistractorRow),
    recall: recallRows.map(mapRecallRow),
    recognition: recognitionRows.map(mapRecognitionRow),
    matching: matchingRows.map(mapMatchingRow),
    telemetry: telemetryRows.map(mapTelemetryRow)
  };
}

function groupRowsBySession<T extends { session_id: string }>(rows: T[]) {
  return rows.reduce<Map<string, T[]>>((groups, row) => {
    const current = groups.get(row.session_id) ?? [];
    current.push(row);
    groups.set(row.session_id, current);
    return groups;
  }, new Map());
}

function cloneParticipantQuestionnaire(questionnaire: ParticipantQuestionnaire | null): ParticipantQuestionnaire | null {
  return questionnaire ? cloneValue(questionnaire) : null;
}

async function getSupabaseBundle(sessionId: string): Promise<SessionBundle | null> {
  const client = getSupabaseClient();
  const [sessionResult, comprehensionResult, distractorResult, recallResult, recognitionResult, matchingResult, telemetryResult] =
    await Promise.all([
      client.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
      client.from("comprehension_responses").select("*").eq("session_id", sessionId).order("trial_index", { ascending: true }),
      client.from("distractor_responses").select("*").eq("session_id", sessionId).order("trial_index", { ascending: true }),
      client.from("recall_responses").select("*").eq("session_id", sessionId).order("prompt_index", { ascending: true }),
      client.from("recognition_responses").select("*").eq("session_id", sessionId).order("prompt_index", { ascending: true }),
      client.from("matching_responses").select("*").eq("session_id", sessionId).order("trial_index", { ascending: true }),
      client.from("telemetry_events").select("*").eq("session_id", sessionId).order("created_at", { ascending: true })
    ]);

  if (sessionResult.error) {
    throw sessionResult.error;
  }
  if (comprehensionResult.error) {
    throw comprehensionResult.error;
  }
  if (distractorResult.error) {
    throw distractorResult.error;
  }
  if (recallResult.error) {
    throw recallResult.error;
  }
  if (recognitionResult.error) {
    throw recognitionResult.error;
  }
  if (matchingResult.error) {
    throw matchingResult.error;
  }
  if (telemetryResult.error) {
    throw telemetryResult.error;
  }

  if (!sessionResult.data) {
    return null;
  }

  return composeBundleFromRows(
    sessionResult.data as SessionRow,
    cloneParticipantQuestionnaire((sessionResult.data as SessionRow).questionnaire),
    comprehensionResult.data ?? [],
    distractorResult.data ?? [],
    recallResult.data ?? [],
    recognitionResult.data ?? [],
    matchingResult.data ?? [],
    telemetryResult.data ?? []
  );
}

async function listSupabaseBundles(): Promise<SessionBundle[]> {
  const client = getSupabaseClient();
  const sessionsResult = await client.from("sessions").select("*").order("created_at", { ascending: false });
  if (sessionsResult.error) {
    throw sessionsResult.error;
  }

  const sessions = (sessionsResult.data ?? []) as SessionRow[];
  if (sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);
  const [comprehensionResult, distractorResult, recallResult, recognitionResult, matchingResult, telemetryResult] =
    await Promise.all([
      client.from("comprehension_responses").select("*").in("session_id", sessionIds).order("trial_index", { ascending: true }),
      client.from("distractor_responses").select("*").in("session_id", sessionIds).order("trial_index", { ascending: true }),
      client.from("recall_responses").select("*").in("session_id", sessionIds).order("prompt_index", { ascending: true }),
      client.from("recognition_responses").select("*").in("session_id", sessionIds).order("prompt_index", { ascending: true }),
      client.from("matching_responses").select("*").in("session_id", sessionIds).order("trial_index", { ascending: true }),
      client.from("telemetry_events").select("*").in("session_id", sessionIds).order("created_at", { ascending: true })
    ]);

  if (comprehensionResult.error) {
    throw comprehensionResult.error;
  }
  if (distractorResult.error) {
    throw distractorResult.error;
  }
  if (recallResult.error) {
    throw recallResult.error;
  }
  if (recognitionResult.error) {
    throw recognitionResult.error;
  }
  if (matchingResult.error) {
    throw matchingResult.error;
  }
  if (telemetryResult.error) {
    throw telemetryResult.error;
  }

  const comprehensionBySession = groupRowsBySession((comprehensionResult.data ?? []) as ComprehensionRow[]);
  const distractorBySession = groupRowsBySession((distractorResult.data ?? []) as DistractorRow[]);
  const recallBySession = groupRowsBySession((recallResult.data ?? []) as RecallRow[]);
  const recognitionBySession = groupRowsBySession((recognitionResult.data ?? []) as RecognitionRow[]);
  const matchingBySession = groupRowsBySession((matchingResult.data ?? []) as MatchingRow[]);
  const telemetryBySession = groupRowsBySession((telemetryResult.data ?? []) as TelemetryRow[]);

  return sessions.map((session) =>
    composeBundleFromRows(
      session,
      cloneParticipantQuestionnaire(session.questionnaire),
      comprehensionBySession.get(session.id) ?? [],
      distractorBySession.get(session.id) ?? [],
      recallBySession.get(session.id) ?? [],
      recognitionBySession.get(session.id) ?? [],
      matchingBySession.get(session.id) ?? [],
      telemetryBySession.get(session.id) ?? []
    )
  );
}

async function createSessionSupabase(input: CreateSessionInput): Promise<CreateSessionResult> {
  const client = getSupabaseClient();
  const study = getStudyOrThrow(input.studySlug);
  const sessions = await listSupabaseBundles();
  const version = chooseBalancedVersion(study, sessions.map((bundle) => bundle.session));
  const sessionId = makeSessionId();
  const participantOrders = makeParticipantOrders(study, sessionId);
  const timestamp = nowIso();
  const questionnaire = normaliseQuestionnaire(input.questionnaire);

  const sessionRow: SessionRow = {
    id: sessionId,
    study_slug: study.slug,
    version_id: version.id,
    version_number: version.versionNumber,
    recall_prompt_order: participantOrders.recallPromptOrder,
    matching_trial_order: participantOrders.matchingTrialOrder,
    status: "created",
    created_at: timestamp,
    updated_at: timestamp,
    completed_at: null,
    completion_code: makeCompletionCode(sessionId),
    device: input.device,
    questionnaire
  };

  const { error } = await client.from("sessions").insert(sessionRow);
  if (error) {
    throw error;
  }

  return {
    session: mapSessionRow(sessionRow),
    nextPath: buildStudyPathWithSession(study.slug, "learn/1", sessionId)
  };
}

async function updateSessionStatusSupabase(sessionId: string, status: SessionStage) {
  const client = getSupabaseClient();
  const timestamp = nowIso();
  const patch: Partial<SessionRow> = {
    status,
    updated_at: timestamp
  };
  if (status === "complete") {
    patch.completed_at = timestamp;
  }

  const { error } = await client.from("sessions").update(patch).eq("id", sessionId);
  if (error) {
    throw error;
  }

  const bundle = await getSupabaseBundle(sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  return bundle;
}

async function appendTelemetrySupabase(sessionId: string, event: Omit<ClientEvent, "createdAt" | "sessionId">) {
  const client = getSupabaseClient();
  const createdAt = nowIso();
  const { error } = await client.from("telemetry_events").insert({
    session_id: sessionId,
    stage: event.stage,
    event_type: event.eventType,
    created_at: createdAt,
    payload: event.payload
  } satisfies TelemetryRow);
  if (error) {
    throw error;
  }

  const sessionResult = await client.from("sessions").update({ updated_at: createdAt }).eq("id", sessionId);
  if (sessionResult.error) {
    throw sessionResult.error;
  }

  const bundle = await getSupabaseBundle(sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  return bundle;
}

async function saveComprehensionResponseSupabase(sessionId: string, input: ComprehensionInput) {
  const client = getSupabaseClient();
  const bundle = await getSupabaseBundle(sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const study = getStudyOrThrow(bundle.session.studySlug);
  const trial = getLearningTrialOrThrow(study.slug, bundle.session.versionId, input.trialIndex);
  const trialCount = getLearningTrialCount(study.slug, bundle.session.versionId);
  const existing = bundle.comprehension.find((entry) => entry.trialIndex === input.trialIndex);

  if (existing) {
    return {
      bundle,
      response: existing,
      nextTrialIndex: existing.trialIndex + 1,
      completed: existing.trialIndex >= trialCount
    };
  }

  const response: ComprehensionRow = {
    session_id: sessionId,
    study_slug: bundle.session.studySlug,
    version_id: bundle.session.versionId,
    trial_index: input.trialIndex,
    answer: input.answer,
    correct: trial.correctAnswer === input.answer,
    response_time_ms: input.responseTimeMs,
    answered_at: nowIso()
  };

  const { error } = await client.from("comprehension_responses").insert(response);
  if (error) {
    throw error;
  }

  await client
    .from("sessions")
    .update({
      status: input.trialIndex >= trialCount ? "distractor" : "learning",
      updated_at: nowIso()
    })
    .eq("id", sessionId);

  const refreshed = await getSupabaseBundle(sessionId);
  if (!refreshed) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  return {
    bundle: refreshed,
    response: mapComprehensionRow(response),
    nextTrialIndex: input.trialIndex + 1,
    completed: input.trialIndex >= trialCount
  };
}

async function saveRecallResponseSupabase(sessionId: string, input: RecallInput) {
  const client = getSupabaseClient();
  const bundle = await getSupabaseBundle(sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const prompt = getRecallPromptOrThrow(bundle.session.studySlug, input.promptIndex);
  const existing = bundle.recall.find((entry) => entry.promptIndex === input.promptIndex);

  if (existing) {
    return {
      bundle,
      response: existing
    };
  }

  const text = input.text.trim();
  const response: RecallRow = {
    session_id: sessionId,
    prompt_index: input.promptIndex,
    pseudoword: prompt.pseudoword,
    text,
    first_keystroke_latency_ms: input.firstKeystrokeLatencyMs,
    total_response_time_ms: input.totalResponseTimeMs,
    edit_count: input.editCount,
    is_empty: text.length === 0,
    pasted: input.pasted,
    paste_count: input.pasteCount,
    submitted_at: nowIso()
  };

  const { error } = await client.from("recall_responses").insert(response);
  if (error) {
    throw error;
  }

  const sessionResult = await client
    .from("sessions")
    .update({
      status: "recall",
      updated_at: nowIso()
    })
    .eq("id", sessionId);
  if (sessionResult.error) {
    throw sessionResult.error;
  }

  const refreshed = await getSupabaseBundle(sessionId);
  if (!refreshed) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  return {
    bundle: refreshed,
    response: mapRecallRow(response)
  };
}

async function saveDistractorResponseSupabase(sessionId: string, input: DistractorInput) {
  const client = getSupabaseClient();
  const bundle = await getSupabaseBundle(sessionId);
  if (!bundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const existing = bundle.distractor.find((entry) => entry.trialIndex === input.trialIndex);
  if (existing) {
    return {
      bundle,
      response: existing
    };
  }

  const response: DistractorRow = {
    session_id: sessionId,
    trial_index: input.trialIndex,
    direction: input.direction,
    sequence_length: input.sequenceLength,
    shown_sequence: input.shownSequence,
    response_sequence: input.responseSequence,
    correct:
      input.shownSequence.length === input.responseSequence.length &&
      input.shownSequence.every((value, index) => value === input.responseSequence[index]),
    response_time_ms: input.responseTimeMs,
    answered_at: nowIso()
  };

  const { error } = await client.from("distractor_responses").insert(response);
  if (error) {
    throw error;
  }

  const sessionResult = await client.from("sessions").update({ status: "distractor", updated_at: nowIso() }).eq("id", sessionId);
  if (sessionResult.error) {
    throw sessionResult.error;
  }

  const refreshed = await getSupabaseBundle(sessionId);
  if (!refreshed) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  return {
    bundle: refreshed,
    response: mapDistractorRow(response)
  };
}

async function saveRecognitionResponseSupabase(sessionId: string, input: RecognitionInput) {
  const client = getSupabaseClient();
  const bundle = await getSupabaseBundle(sessionId);
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
      bundle,
      response: existing,
      nextPromptIndex: existing.promptIndex + 1,
      completed: answeredPromptIndexes.size >= study.recallPrompts.length
    };
  }

  const response: RecognitionRow = {
    session_id: sessionId,
    prompt_index: input.promptIndex,
    pseudoword: prompt.pseudoword,
    selected_option_index: input.selectedOptionIndex,
    selected_option_text: option.text,
    correct: option.isCorrect,
    response_time_ms: input.responseTimeMs,
    answered_at: nowIso()
  };

  const { error } = await client.from("recognition_responses").insert(response);
  if (error) {
    throw error;
  }

  const updatedBundle = await getSupabaseBundle(sessionId);
  if (!updatedBundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const answeredPromptIndexes = new Set(updatedBundle.recognition.map((entry) => entry.promptIndex));
  const completed = answeredPromptIndexes.size >= study.recallPrompts.length;
  await client
    .from("sessions")
    .update({
      status: completed ? "matching" : "recall",
      updated_at: nowIso()
    })
    .eq("id", sessionId);

  const refreshed = await getSupabaseBundle(sessionId);
  if (!refreshed) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  return {
    bundle: refreshed,
    response: mapRecognitionRow(response),
    nextPromptIndex: input.promptIndex + 1,
    completed
  };
}

async function saveMatchingResponseSupabase(sessionId: string, input: MatchingInput) {
  const client = getSupabaseClient();
  const bundle = await getSupabaseBundle(sessionId);
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
      bundle,
      response: existing,
      nextTrialIndex,
      completed: answeredTrialIndexes.size >= trialCount
    };
  }

  const response: MatchingRow = {
    session_id: sessionId,
    trial_index: input.trialIndex,
    picture_id: trial.pictureId,
    condition: trial.condition,
    answer: input.answer,
    correct: trial.correctAnswer === input.answer,
    response_time_ms: input.responseTimeMs,
    answered_at: nowIso()
  };

  const { error } = await client.from("matching_responses").insert(response);
  if (error) {
    throw error;
  }

  const refreshed = await getSupabaseBundle(sessionId);
  if (!refreshed) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  const answeredTrialIndexes = new Set(refreshed.matching.map((entry) => entry.trialIndex));
  const completed = answeredTrialIndexes.size >= trialCount;
  const nextTrialIndex = refreshed.session.matchingTrialOrder.find((trialIndex) => !answeredTrialIndexes.has(trialIndex)) ?? trialCount + 1;
  await client
    .from("sessions")
    .update({
      status: completed ? "complete" : "matching",
      updated_at: nowIso(),
      completed_at: completed ? nowIso() : null
    })
    .eq("id", sessionId);

  const finalBundle = await getSupabaseBundle(sessionId);
  if (!finalBundle) {
    throw new Error(`Session ${sessionId} was not found.`);
  }

  return {
    bundle: finalBundle,
    response: mapMatchingRow(response),
    nextTrialIndex,
    completed
  };
}

function isSupabaseMode() {
  return getStorageMode() === "supabase";
}

export function createSession(input: CreateSessionInput) {
  return (isSupabaseMode() ? createSessionSupabase(input) : createSessionLocal(input)) as ReturnType<typeof createSessionLocal>;
}

export function getSessionBundle(sessionId: string) {
  return (isSupabaseMode() ? getSupabaseBundle(sessionId) : getSessionBundleLocal(sessionId)) as ReturnType<typeof getSessionBundleLocal>;
}

export function listSessionBundles() {
  return (isSupabaseMode() ? listSupabaseBundles() : listSessionBundlesLocal()) as ReturnType<typeof listSessionBundlesLocal>;
}

export function updateSessionStatus(sessionId: string, status: SessionStage) {
  return (isSupabaseMode() ? updateSessionStatusSupabase(sessionId, status) : updateSessionStatusLocal(sessionId, status)) as ReturnType<typeof updateSessionStatusLocal>;
}

export function appendTelemetry(sessionId: string, event: Omit<ClientEvent, "createdAt" | "sessionId">) {
  return (isSupabaseMode() ? appendTelemetrySupabase(sessionId, event) : appendTelemetryLocal(sessionId, event)) as ReturnType<typeof appendTelemetryLocal>;
}

export function saveComprehensionResponse(sessionId: string, input: ComprehensionInput) {
  return (isSupabaseMode() ? saveComprehensionResponseSupabase(sessionId, input) : saveComprehensionResponseLocal(sessionId, input)) as ReturnType<typeof saveComprehensionResponseLocal>;
}

export function saveRecallResponse(sessionId: string, input: RecallInput) {
  return (isSupabaseMode() ? saveRecallResponseSupabase(sessionId, input) : saveRecallResponseLocal(sessionId, input)) as ReturnType<typeof saveRecallResponseLocal>;
}

export function saveDistractorResponse(sessionId: string, input: DistractorInput) {
  return (isSupabaseMode() ? saveDistractorResponseSupabase(sessionId, input) : saveDistractorResponseLocal(sessionId, input)) as ReturnType<typeof saveDistractorResponseLocal>;
}

export function saveRecognitionResponse(sessionId: string, input: RecognitionInput) {
  return (isSupabaseMode() ? saveRecognitionResponseSupabase(sessionId, input) : saveRecognitionResponseLocal(sessionId, input)) as ReturnType<typeof saveRecognitionResponseLocal>;
}

export function saveMatchingResponse(sessionId: string, input: MatchingInput) {
  return (isSupabaseMode() ? saveMatchingResponseSupabase(sessionId, input) : saveMatchingResponseLocal(sessionId, input)) as ReturnType<typeof saveMatchingResponseLocal>;
}

export function __resetStoreForTests() {
  if (isSupabaseMode()) {
    throw new Error("Resetting the Supabase store is disabled in this environment.");
  }

  resetStoreForTestsLocal();
}
