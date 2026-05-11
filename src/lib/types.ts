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
}

export interface CreateSessionResult {
  session: ParticipantSession;
  nextPath: string;
}
