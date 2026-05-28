import { appText } from "@/content/app-text";
import { instructionText } from "@/content/instruction-text";
import { questionnaireText } from "@/content/questionnaire-text";
import type {
  EditableContentKey,
  EditableContentOverrides,
  EditableContentStyleOverrides,
  EditableContentTextStyle,
  EditableContentScreen,
  EditableContentValue,
  EditableFieldDefinition,
  EditableFieldKind,
  ResolvedContentSnapshot
} from "@/lib/types";

export const editableScreens = [
  "questionnaire",
  "nvlt",
  "learning",
  "distractor",
  "recall",
  "matching"
] as const satisfies readonly EditableContentScreen[];

export const defaultContentSnapshot = {
  appText,
  instructionText,
  questionnaireText
} as const satisfies ResolvedContentSnapshot;

const editableContentKeySet = new Set<string>();

const templateFieldConfig: Record<EditableContentKey, readonly string[]> = {
  "appText.study.learning.progressLabel": ["current", "total"],
  "appText.study.distractor.blockAriaLabel": ["index"],
  "appText.study.distractor.trialPill": ["trialIndex"],
  "appText.study.distractor.scorePill": ["score"],
  "appText.study.distractor.selectedCount": ["selected", "total"],
  "appText.study.recall.progressLabel": ["stepLabel", "current", "total"],
  "appText.study.matching.progressLabel": ["current", "total"],
  "appText.nvlt.progressTitle": ["current", "total"],
  "appText.nvlt.sheetTitle": ["current"],
  "instructionText.nvlt.inputAriaLabel": ["prompt"],
  "instructionText.nvlt.inputSrLabel": ["prompt"]
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function humanizeSegment(segment: string) {
  return segment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/^\d+$/, (match) => String(Number(match) + 1))
    .trim();
}

function titleCase(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatContent(template: string, values: Record<string, string | number | boolean | null | undefined>) {
  return template.replace(/\{([^}]+)\}/g, (_, token: string) => {
    const nextValue = values[token];
    return nextValue === null || nextValue === undefined ? "" : String(nextValue);
  });
}

function getValueFromPath(target: unknown, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, part) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      return current[Number(part)];
    }

    if (typeof current === "object") {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, target);
}

function setValueAtPath<T>(target: T, dottedPath: string, value: EditableContentValue): T {
  const parts = dottedPath.split(".");
  const root = cloneValue(target) as Record<string, unknown>;
  let cursor: Record<string, unknown> | unknown[] = root;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const isArray = Array.isArray(cursor);
    const nextValue: unknown = isArray ? (cursor as unknown[])[Number(part)] : (cursor as Record<string, unknown>)[part];

    if (nextValue && typeof nextValue === "object") {
      cursor = nextValue as Record<string, unknown> | unknown[];
      continue;
    }

    const nextPart = parts[index + 1];
    const createdContainer: Record<string, unknown> | unknown[] = /^\d+$/.test(nextPart) ? [] : {};

    if (isArray) {
      (cursor as unknown[])[Number(part)] = createdContainer;
    } else {
      (cursor as Record<string, unknown>)[part] = createdContainer;
    }

    cursor = createdContainer;
  }

  const lastPart = parts.at(-1) ?? "";
  if (Array.isArray(cursor)) {
    cursor[Number(lastPart)] = value;
  } else {
    cursor[lastPart] = value;
  }

  return root as T;
}

function inferScreenFromKey(key: EditableContentKey): EditableContentScreen {
  if (key.startsWith("questionnaireText.")) {
    return "questionnaire";
  }

  if (key.startsWith("instructionText.nvlt.") || key.startsWith("appText.nvlt.")) {
    return "nvlt";
  }

  if (key.startsWith("instructionText.study.learning.") || key.startsWith("appText.study.learning.")) {
    return "learning";
  }

  if (key.startsWith("instructionText.study.distractor.") || key.startsWith("appText.study.distractor.")) {
    return "distractor";
  }

  if (key.startsWith("instructionText.study.recall.") || key.startsWith("appText.study.recall.")) {
    return "recall";
  }

  if (key.startsWith("instructionText.study.matching.") || key.startsWith("appText.study.matching.")) {
    return "matching";
  }

  if (key === "appText.study.pages.recallTitle") {
    return "recall";
  }

  if (key === "appText.study.pages.matchingTitle") {
    return "matching";
  }

  return "questionnaire";
}

function inferFieldKind(key: EditableContentKey, value: EditableContentValue): EditableFieldKind {
  if (templateFieldConfig[key]) {
    return "template";
  }

  if (value.includes("\n") || value.length > 80) {
    return "textarea";
  }

  return "text";
}

function buildFieldLabel(key: EditableContentKey) {
  const parts = key.split(".");
  const tail = parts.slice(-2).map(humanizeSegment).join(" / ");
  return titleCase(tail);
}

function buildSectionLabel(key: EditableContentKey) {
  const parts = key.split(".");
  return parts.slice(0, -1).map(humanizeSegment).join(" / ");
}

function flattenFields(target: unknown, pathParts: string[] = []): EditableFieldDefinition[] {
  if (typeof target === "string") {
    const key = pathParts.join(".");
    const requiredPlaceholders = [...(templateFieldConfig[key] ?? [])];
    return [
      {
        key,
        label: buildFieldLabel(key),
        section: buildSectionLabel(key),
        screen: inferScreenFromKey(key),
        kind: inferFieldKind(key, target),
        defaultValue: target,
        requiredPlaceholders
      }
    ];
  }

  if (Array.isArray(target)) {
    return target.flatMap((entry, index) => flattenFields(entry, [...pathParts, String(index)]));
  }

  if (target && typeof target === "object") {
    return Object.entries(target).flatMap(([key, value]) => flattenFields(value, [...pathParts, key]));
  }

  return [];
}

export const editableFieldDefinitions = flattenFields(defaultContentSnapshot);
for (const field of editableFieldDefinitions) {
  editableContentKeySet.add(field.key);
}

export function getEditableFieldDefinitionsForScreen(screen: EditableContentScreen) {
  return editableFieldDefinitions.filter((definition) => definition.screen === screen);
}

export function validateContentOverrides(overrides: EditableContentOverrides) {
  for (const [key, value] of Object.entries(overrides)) {
    if (!editableContentKeySet.has(key)) {
      return `Unknown editable content key: ${key}`;
    }

    const requiredPlaceholders = templateFieldConfig[key] ?? [];
    for (const placeholder of requiredPlaceholders) {
      if (!value.includes(`{${placeholder}}`)) {
        return `Missing placeholder {${placeholder}} in ${key}.`;
      }
    }
  }

  return null;
}

export function applyContentOverrides(
  snapshot: ResolvedContentSnapshot,
  overrides: EditableContentOverrides
): ResolvedContentSnapshot {
  return Object.entries(overrides).reduce<ResolvedContentSnapshot>(
    (current, [key, value]) => (editableContentKeySet.has(key) ? setValueAtPath(current, key, value) : current),
    cloneValue(snapshot)
  );
}

export function getEditableContentValue(snapshot: ResolvedContentSnapshot, key: EditableContentKey) {
  const value = getValueFromPath(snapshot, key);
  return typeof value === "string" ? value : "";
}

export function getDefaultEditableContentValue(key: EditableContentKey) {
  return getEditableContentValue(defaultContentSnapshot, key);
}

function normalizeTextStyleValue(value: EditableContentTextStyle) {
  const next: EditableContentTextStyle = {};

  if (typeof value.fontSize === "string") {
    const trimmed = value.fontSize.trim();
    if (trimmed) {
      next.fontSize = trimmed;
    }
  }

  if (value.fontWeight === "bold" || value.fontWeight === "normal") {
    next.fontWeight = value.fontWeight;
  }

  if (value.fontStyle === "italic" || value.fontStyle === "normal") {
    next.fontStyle = value.fontStyle;
  }

  return next;
}

export function getEditableContentStyleValue(overrides: EditableContentStyleOverrides, key: EditableContentKey) {
  return overrides[key] ?? {};
}

export function getDefaultEditableContentStyleValue() {
  return {};
}

export function validateContentStyleOverrides(overrides: EditableContentStyleOverrides) {
  for (const [key, value] of Object.entries(overrides)) {
    if (!editableContentKeySet.has(key)) {
      return `Unknown editable content style key: ${key}`;
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return `Invalid editable content style value for ${key}.`;
    }

    const styleValue = value as EditableContentTextStyle;
    if (typeof styleValue.fontSize !== "undefined" && typeof styleValue.fontSize !== "string") {
      return `Invalid font size for ${key}.`;
    }

    if (
      typeof styleValue.fontWeight !== "undefined" &&
      styleValue.fontWeight !== "normal" &&
      styleValue.fontWeight !== "bold"
    ) {
      return `Invalid font weight for ${key}.`;
    }

    if (
      typeof styleValue.fontStyle !== "undefined" &&
      styleValue.fontStyle !== "normal" &&
      styleValue.fontStyle !== "italic"
    ) {
      return `Invalid font style for ${key}.`;
    }
  }

  return null;
}

export function normalizeContentStyleOverrides(overrides: EditableContentStyleOverrides) {
  const next: EditableContentStyleOverrides = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const normalized = normalizeTextStyleValue(value as EditableContentTextStyle);
    if (Object.keys(normalized).length > 0) {
      next[key] = normalized;
    }
  }

  return next;
}

export function normalizeContentOverrides(overrides: EditableContentOverrides) {
  const next: EditableContentOverrides = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value !== "string") {
      continue;
    }

    if (!editableContentKeySet.has(key)) {
      continue;
    }

    const defaultValue = getDefaultEditableContentValue(key);
    if (value === defaultValue) {
      continue;
    }

    next[key] = value;
  }

  return next;
}

export function getScreenFromPathname(pathname: string): EditableContentScreen | null {
  if (pathname === "/nvlt") {
    return "nvlt";
  }

  if (pathname.startsWith("/study/")) {
    if (pathname.includes("/start")) {
      return "questionnaire";
    }
    if (pathname.includes("/learn/")) {
      return "learning";
    }
    if (pathname.includes("/distractor")) {
      return "distractor";
    }
    if (pathname.includes("/recall/")) {
      return "recall";
    }
    if (pathname.includes("/matching")) {
      return "matching";
    }
  }

  return null;
}
