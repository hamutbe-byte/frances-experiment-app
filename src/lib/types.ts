export type YesNoAnswer = "yes" | "no";
export type MatchingAnswer = YesNoAnswer | "timeout";
export type SessionStage = "created" | "instructions" | "learning" | "distractor" | "recall" | "matching" | "complete";
export type DistractorDirection = "forward" | "backward";
export type MatchingCondition = "match" | "distractor" | "category" | "unrelated";
export type MatchingRelation = MatchingCondition;
export type MatchingFamily = "target" | "distractor" | "category" | "unrelated";

export interface StudyTargetWord {
  pseudoword: string;
  display: string;
  intendedMeaning: string;
  meaningCode: string;
}

export interface LearningTrial {
  trialIndex: number;
  rowNumber: number;
  tokenId: string;
  pseudoword: string;
  displayWord: string;
  meaningCode: string;
  meaningLabel: string;
  diversityLevel: number;
  storyNumber: number;
  passageText: string;
  comprehensionPromptText: string;
  comprehensionPromptHtml: string;
  correctAnswer: YesNoAnswer;
  isCritical: boolean;
}

export interface StudyVersion {
  id: string;
  label: string;
  versionNumber: number;
  learningTrials: LearningTrial[];
}

export interface RecallPrompt {
  promptIndex: number;
  pseudoword: string;
  displayWord: string;
  meaningCode: string;
  meaningLabel: string;
  promptText: string;
  promptHtml: string;
  recognitionOptions: RecognitionOption[];
  correctOptionIndex: number;
  distractorPseudoword: string;
}

export interface RecognitionOption {
  optionIndex: number;
  text: string;
  displayText: string;
  isCorrect: boolean;
}

export interface MatchingTrial {
  trialIndex: number;
  pictureId: string;
  imagePath: string;
  pseudoword: string;
  displayWord: string;
  meaningCode: string;
  meaningLabel: string;
  relation: MatchingRelation;
  family: MatchingFamily;
  condition: MatchingCondition;
  correctAnswer: YesNoAnswer;
}

export interface StudyData {
  slug: string;
  title: string;
  citation: string;
  sourceWorkbook: string;
  summary: string;
  targetWords: StudyTargetWord[];
  versions: StudyVersion[];
  recallPrompts: RecallPrompt[];
  matchingTrials: MatchingTrial[];
}

export interface DeviceSnapshot {
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  language: string;
  platform: string;
  deviceType: "mobile" | "tablet" | "desktop";
  timezone: string;
}

export interface QuestionnairePercentageEntryInput {
  language: string;
  percentage: string;
}

export interface QuestionnaireCultureEntryInput {
  culture: string;
  identificationLevel: number | null;
}

export interface ParticipantLanguageProfileInput {
  language: string;
  languageStatus: string;
  ageBeganAcquiring: number | null;
  ageBecameFluent: number | null;
  ageBeganReading: number | null;
  ageBecameFluentReading: number | null;
  countryYears: number | null;
  countryMonths: number | null;
  familyYears: number | null;
  familyMonths: number | null;
  schoolWorkYears: number | null;
  schoolWorkMonths: number | null;
  speakingProficiency: number | null;
  understandingSpokenLanguageProficiency: number | null;
  readingProficiency: number | null;
  learningByFriends: number | null;
  learningByFamily: number | null;
  learningByReading: number | null;
  learningByLanguageTapesSelfInstruction: number | null;
  learningByWatchingTv: number | null;
  learningByListeningToRadio: number | null;
  exposureToFriends: number | null;
  exposureToFamily: number | null;
  exposureToWatchingTv: number | null;
  exposureToRadioMusic: number | null;
  exposureToReading: number | null;
  exposureToLanguageLabSelfInstruction: number | null;
  foreignAccent: number | null;
  nonNativeIdentificationByAccent: number | null;
}

export interface ParticipantQuestionnaireInput {
  lastName: string;
  firstName: string;
  todayDate: string;
  age: number | null;
  dateOfBirth: string;
  gender: string;
  languagesByDominance: string[];
  languagesByAcquisition: string[];
  currentExposure: QuestionnairePercentageEntryInput[];
  readingPreference: QuestionnairePercentageEntryInput[];
  speakingPreference: QuestionnairePercentageEntryInput[];
  cultures: QuestionnaireCultureEntryInput[];
  yearsOfEducation: number | null;
  educationLevel: string;
  educationLevelOther: string;
  usaImmigrationDate: string;
  otherImmigrationDetails: string;
  hasVisionProblem: boolean;
  hasHearingImpairment: boolean;
  hasLanguageDisability: boolean;
  hasLearningDisability: boolean;
  disabilityExplanation: string;
  languageProfiles: ParticipantLanguageProfileInput[];
}

export interface ParticipantQuestionnaire extends ParticipantQuestionnaireInput {
  submittedAt: string;
}

export interface ParticipantSession {
  id: string;
  studySlug: string;
  versionId: string;
  versionNumber: number;
  recallPromptOrder: number[];
  matchingTrialOrder: number[];
  status: SessionStage;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  completionCode: string;
  device: DeviceSnapshot;
}

export interface ComprehensionResponse {
  sessionId: string;
  studySlug: string;
  versionId: string;
  trialIndex: number;
  answer: YesNoAnswer;
  correct: boolean;
  responseTimeMs: number;
  answeredAt: string;
}

export interface RecallItemResponse {
  sessionId: string;
  promptIndex: number;
  pseudoword: string;
  text: string;
  firstKeystrokeLatencyMs: number | null;
  totalResponseTimeMs: number;
  editCount: number;
  isEmpty: boolean;
  pasted: boolean;
  pasteCount: number;
  submittedAt: string;
}

export interface DistractorResponse {
  sessionId: string;
  trialIndex: number;
  direction: DistractorDirection;
  sequenceLength: number;
  shownSequence: number[];
  responseSequence: number[];
  correct: boolean;
  responseTimeMs: number;
  answeredAt: string;
}

export interface RecognitionResponse {
  sessionId: string;
  promptIndex: number;
  pseudoword: string;
  selectedOptionIndex: number;
  selectedOptionText: string;
  correct: boolean;
  responseTimeMs: number;
  answeredAt: string;
}

export interface MatchingResponse {
  sessionId: string;
  trialIndex: number;
  pictureId: string;
  condition: MatchingCondition;
  answer: MatchingAnswer;
  correct: boolean;
  responseTimeMs: number;
  answeredAt: string;
}

export interface ClientEvent {
  sessionId: string;
  stage: SessionStage;
  eventType:
    | "focus_lost"
    | "focus_gained"
    | "visibility_hidden"
    | "visibility_visible"
    | "paste"
    | "copy"
    | "cut"
    | "clipboard_shortcut"
    | "beforeinput_paste"
    | "resize"
    | "navigation_attempt";
  createdAt: string;
  payload: Record<string, string | number | boolean | null>;
}

export interface SessionBundle {
  session: ParticipantSession;
  questionnaire: ParticipantQuestionnaire | null;
  comprehension: ComprehensionResponse[];
  distractor: DistractorResponse[];
  recall: RecallItemResponse[];
  recognition: RecognitionResponse[];
  matching: MatchingResponse[];
  telemetry: ClientEvent[];
}

export interface CreateSessionInput {
  studySlug: string;
  device: DeviceSnapshot;
  questionnaire?: ParticipantQuestionnaireInput | null;
}

export interface CreateSessionResult {
  session: ParticipantSession;
  nextPath: string;
}

export type EditableContentKey = string;
export type EditableContentValue = string;
export type EditableContentScreen =
  | "home"
  | "questionnaire"
  | "nvlt"
  | "instructions"
  | "learning"
  | "distractor"
  | "recall"
  | "matching"
  | "complete";
export type EditableFieldKind = "text" | "textarea" | "template";

export type EditableContentOverrides = Record<EditableContentKey, EditableContentValue>;

export interface EditableContentOverride {
  key: EditableContentKey;
  value: EditableContentValue;
}

export interface EditableFieldDefinition {
  key: EditableContentKey;
  label: string;
  section: string;
  screen: EditableContentScreen;
  kind: EditableFieldKind;
  defaultValue: string;
  requiredPlaceholders: string[];
}

export interface ResolvedContentSnapshot {
  appText: Record<string, unknown>;
  instructionText: Record<string, unknown>;
  questionnaireText: Record<string, unknown>;
}

export type EditableUiKey = string;
export type EditableUiValue = string;
export type EditableUiOverrides = Record<EditableUiKey, EditableUiValue>;

export interface EditableUiFieldDefinition {
  key: EditableUiKey;
  label: string;
  section: string;
  screens: EditableContentScreen[] | "all";
  defaultValue: string;
  helperText?: string;
}

export interface ResolvedUiSnapshot {
  fontSizes: Record<string, string>;
}
