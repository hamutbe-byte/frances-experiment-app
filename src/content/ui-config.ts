import type { CSSProperties } from "react";

import type {
  EditableContentScreen,
  EditableUiFieldDefinition,
  EditableUiKey,
  EditableUiOverrides,
  ResolvedUiSnapshot
} from "@/lib/types";

export const uiConfig = {
  fontSizes: {
    eyebrow: "0.78rem",
    heroTitle: "clamp(2.2rem, 5vw, 4rem)",
    heroSubtitle: "1.04rem",
    metaLabel: "0.78rem",
    metaValue: "1.1rem",
    sectionTitle: "1.2rem",
    fieldLabel: "0.9rem",
    formInput: "1rem",
    homeCardTitle: "1.6rem",
    adminTable: "0.92rem",
    adminTableHeader: "0.74rem",
    toolbarLabel: "0.74rem",
    toolbarButton: "0.78rem",
    button: "0.98rem",
    pill: "0.84rem",
    countdown: "clamp(2rem, 5vw, 3.4rem)",
    feedback: "1rem",
    passage: "clamp(1.1rem, 2vw, 1.28rem)",
    recallPrompt: "clamp(1rem, 2vw, 1.16rem)",
    matchingWord: "clamp(2.1rem, 8vw, 4rem)",
    questionLabel: "0.82rem",
    questionText: "1.08rem",
    answerTitle: "1.02rem",
    answerHint: "0.92rem",
    textInput: "1.08rem",
    status: "0.95rem",
    nvltPageTitle: "1.2rem",
    nvltSheetTitle: "clamp(2rem, 4vw, 2.8rem)",
    nvltWordChip: "clamp(1.6rem, 2vw, 2.1rem)",
    nvltNumberInput: "1rem",
    nvltPromptText: "clamp(1.45rem, 2vw, 2.1rem)",
    nvltChoiceButton: "1.1rem",
    completionCode: "1.1rem",
    mobileNvltWordChip: "1.3rem",
    mobileNvltPromptText: "1.2rem"
  }
} as const satisfies ResolvedUiSnapshot;

const cssVariableMap = {
  eyebrow: "--font-size-eyebrow",
  heroTitle: "--font-size-hero-title",
  heroSubtitle: "--font-size-hero-subtitle",
  metaLabel: "--font-size-meta-label",
  metaValue: "--font-size-meta-value",
  sectionTitle: "--font-size-section-title",
  fieldLabel: "--font-size-field-label",
  formInput: "--font-size-form-input",
  homeCardTitle: "--font-size-home-card-title",
  adminTable: "--font-size-admin-table",
  adminTableHeader: "--font-size-admin-table-header",
  toolbarLabel: "--font-size-toolbar-label",
  toolbarButton: "--font-size-toolbar-button",
  button: "--font-size-button",
  pill: "--font-size-pill",
  countdown: "--font-size-countdown",
  feedback: "--font-size-feedback",
  passage: "--font-size-passage",
  recallPrompt: "--font-size-recall-prompt",
  matchingWord: "--font-size-matching-word",
  questionLabel: "--font-size-question-label",
  questionText: "--font-size-question-text",
  answerTitle: "--font-size-answer-title",
  answerHint: "--font-size-answer-hint",
  textInput: "--font-size-text-input",
  status: "--font-size-status",
  nvltPageTitle: "--font-size-nvlt-page-title",
  nvltSheetTitle: "--font-size-nvlt-sheet-title",
  nvltWordChip: "--font-size-nvlt-word-chip",
  nvltNumberInput: "--font-size-nvlt-number-input",
  nvltPromptText: "--font-size-nvlt-prompt-text",
  nvltChoiceButton: "--font-size-nvlt-choice-button",
  completionCode: "--font-size-completion-code",
  mobileNvltWordChip: "--font-size-mobile-nvlt-word-chip",
  mobileNvltPromptText: "--font-size-mobile-nvlt-prompt-text"
} as const satisfies Record<keyof typeof uiConfig.fontSizes, string>;

interface UiFieldConfig {
  key: keyof typeof uiConfig.fontSizes;
  label: string;
  section: string;
  screens: EditableContentScreen[] | "all";
  helperText?: string;
}

const uiFieldConfig: UiFieldConfig[] = [
  { key: "button", label: "כפתורים", section: "Global Typography", screens: "all", helperText: "לדוגמה: 1rem או 18px" },
  { key: "status", label: "טקסט סטטוס", section: "Global Typography", screens: "all", helperText: "לדוגמה: 0.95rem" },
  { key: "pill", label: "Pills", section: "Global Typography", screens: ["learning", "distractor", "recall", "matching"] },
  { key: "sectionTitle", label: "כותרות מקטע", section: "Questionnaire Typography", screens: ["questionnaire"] },
  { key: "fieldLabel", label: "תוויות שדות", section: "Questionnaire Typography", screens: ["questionnaire"] },
  { key: "formInput", label: "שדות קלט", section: "Questionnaire Typography", screens: ["questionnaire"] },
  { key: "passage", label: "טקסט קטע", section: "Learning Typography", screens: ["learning"] },
  { key: "questionLabel", label: "תווית שאלה", section: "Task Typography", screens: ["learning", "matching", "recall"] },
  { key: "questionText", label: "טקסט שאלה", section: "Task Typography", screens: ["learning"] },
  { key: "answerTitle", label: "כותרת תשובה", section: "Task Typography", screens: ["learning", "matching"] },
  { key: "answerHint", label: "רמז תשובה", section: "Task Typography", screens: ["learning", "matching"] },
  { key: "textInput", label: "שדות טקסט", section: "Task Typography", screens: ["questionnaire", "recall"] },
  { key: "countdown", label: "טיימר", section: "Distractor Typography", screens: ["distractor"] },
  { key: "feedback", label: "משוב", section: "Distractor Typography", screens: ["distractor"] },
  { key: "matchingWord", label: "מילת התאמה", section: "Matching Typography", screens: ["matching"] },
  { key: "completionCode", label: "קוד סיום", section: "Complete Typography", screens: ["complete"] },
  { key: "nvltPageTitle", label: "כותרת התקדמות", section: "NVLT Typography", screens: ["nvlt"] },
  { key: "nvltWordChip", label: "רשימת מילים", section: "NVLT Typography", screens: ["nvlt"], helperText: "שולט על כל המילים ברשימה בבת אחת" },
  { key: "nvltNumberInput", label: "תיבות תשובה", section: "NVLT Typography", screens: ["nvlt"] },
  { key: "nvltPromptText", label: "משמעויות השאלה", section: "NVLT Typography", screens: ["nvlt"], helperText: "שולט על כל שורות המשמעות ב־NVLT ממקום אחד" },
  { key: "mobileNvltWordChip", label: "רשימת מילים במובייל", section: "NVLT Typography", screens: ["nvlt"] },
  { key: "mobileNvltPromptText", label: "משמעויות במובייל", section: "NVLT Typography", screens: ["nvlt"] }
];

function cloneUiSnapshot(snapshot: ResolvedUiSnapshot): ResolvedUiSnapshot {
  return {
    fontSizes: { ...snapshot.fontSizes }
  };
}

export const defaultUiSnapshot = cloneUiSnapshot(uiConfig);

export const editableUiFieldDefinitions: EditableUiFieldDefinition[] = uiFieldConfig.map((field) => ({
  key: `fontSizes.${field.key}`,
  label: field.label,
  section: field.section,
  screens: field.screens,
  defaultValue: defaultUiSnapshot.fontSizes[field.key],
  helperText: field.helperText
}));

export function getEditableUiFieldsForScreen(screen: EditableContentScreen) {
  return editableUiFieldDefinitions.filter((field) => field.screens === "all" || field.screens.includes(screen));
}

export function getEditableUiValue(snapshot: ResolvedUiSnapshot, key: EditableUiKey) {
  const [, fontSizeKey] = key.split(".");
  return snapshot.fontSizes[fontSizeKey] ?? "";
}

export function getDefaultEditableUiValue(key: EditableUiKey) {
  return getEditableUiValue(defaultUiSnapshot, key);
}

export function validateUiOverrides(overrides: EditableUiOverrides) {
  const validKeys = new Set(editableUiFieldDefinitions.map((field) => field.key));

  for (const [key, value] of Object.entries(overrides)) {
    if (!validKeys.has(key)) {
      return `Unknown editable UI key: ${key}`;
    }

    if (!value.trim()) {
      return `UI value cannot be empty for ${key}.`;
    }
  }

  return null;
}

export function normalizeUiOverrides(overrides: EditableUiOverrides) {
  const next: EditableUiOverrides = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (value === getDefaultEditableUiValue(key)) {
      continue;
    }

    next[key] = value;
  }

  return next;
}

export function applyUiOverrides(snapshot: ResolvedUiSnapshot, overrides: EditableUiOverrides): ResolvedUiSnapshot {
  const nextSnapshot = cloneUiSnapshot(snapshot);

  for (const [key, value] of Object.entries(overrides)) {
    const [, fontSizeKey] = key.split(".");
    nextSnapshot.fontSizes[fontSizeKey] = value;
  }

  return nextSnapshot;
}

export function getUiCssVariables(snapshot: ResolvedUiSnapshot = defaultUiSnapshot) {
  const nextVariables: Record<string, string> = {};

  (Object.keys(cssVariableMap) as Array<keyof typeof cssVariableMap>).forEach((key) => {
    nextVariables[cssVariableMap[key]] = snapshot.fontSizes[key];
  });

  return nextVariables as CSSProperties;
}
