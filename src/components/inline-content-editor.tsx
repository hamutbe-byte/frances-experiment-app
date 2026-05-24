"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getDefaultEditableUiValue, getEditableUiValue } from "@/content/ui-config";
import { useResolvedContent } from "@/components/content-provider";
import { disableContentEditMode, isContentEditModeEnabled } from "@/lib/content-edit-mode";
import { getDefaultEditableContentValue, getEditableContentValue } from "@/lib/content";
import type {
  EditableContentKey,
  EditableContentOverrides,
  EditableContentScreen,
  EditableFieldDefinition,
  EditableUiFieldDefinition,
  EditableUiKey,
  EditableUiOverrides,
  EditableContentStyleOverrides,
  EditableContentTextStyle
} from "@/lib/types";

interface InlineContentEditorProps {
  screen: EditableContentScreen;
}

interface InlineEditorTarget {
  field: EditableFieldDefinition;
  value: string;
  style: InlineEditorStyleDraft;
  top: number;
  left: number;
  width: number;
}

interface InlineEditorStyleDraft {
  fontSize: string;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

function createInlineTarget(
  field: EditableFieldDefinition,
  sourceElement: HTMLElement,
  value: string,
  style?: EditableContentTextStyle
): InlineEditorTarget {
  const rect = sourceElement.getBoundingClientRect();
  const maxWidth = Math.min(680, window.innerWidth - 32);

  return {
    field,
    value,
    style: buildInlineStyleDraft(style),
    top: window.innerHeight / 2,
    left: window.innerWidth / 2,
    width: Math.max(560, Math.min(rect.width, maxWidth))
  };
}

function buildInlineStyleDraft(style?: EditableContentTextStyle): InlineEditorStyleDraft {
  return {
    fontSize: style?.fontSize ?? "",
    fontWeight: style?.fontWeight ?? "normal",
    fontStyle: style?.fontStyle ?? "normal"
  };
}

function normalizeInlineStyleDraft(style: InlineEditorStyleDraft): EditableContentTextStyle {
  return {
    fontSize: style.fontSize.trim(),
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle
  };
}

function parseInlineFontSize(value: string) {
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)rem$/);
  return match ? Number(match[1]) : 1;
}

function formatInlineFontSize(value: number) {
  return `${Number(value.toFixed(2)).toString()}rem`;
}

function resolveKeyedElement(target: HTMLElement) {
  const directMatch = target.closest("[data-content-key]");
  if (directMatch instanceof HTMLElement) {
    return directMatch;
  }

  const nestedMatches = target.querySelectorAll?.("[data-content-key]");
  if (nestedMatches && nestedMatches.length === 1) {
    const nestedMatch = nestedMatches[0];
    return nestedMatch instanceof HTMLElement ? nestedMatch : null;
  }

  return null;
}

function groupFieldsBySection<T extends { section: string }>(fields: T[]) {
  const groups = new Map<string, T[]>();

  for (const field of fields) {
    const current = groups.get(field.section) ?? [];
    current.push(field);
    groups.set(field.section, current);
  }

  return [...groups.entries()];
}

export function InlineContentEditor({ screen }: InlineContentEditorProps) {
  const router = useRouter();
  const { snapshot, setSnapshot, fields, styleOverrides, setStyleOverrides, uiSnapshot, setUiSnapshot, uiFields } = useResolvedContent();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<EditableContentOverrides>({});
  const [uiDraft, setUiDraft] = useState<EditableUiOverrides>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isInlineSaving, setIsInlineSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineTarget, setInlineTarget] = useState<InlineEditorTarget | null>(null);

  const screenFields = useMemo(() => fields.filter((field) => field.screen === screen), [fields, screen]);
  const screenUiFields = useMemo(
    () => uiFields.filter((field) => field.screens === "all" || field.screens.includes(screen)),
    [screen, uiFields]
  );
  const groupedFields = useMemo(() => groupFieldsBySection(screenFields), [screenFields]);
  const groupedUiFields = useMemo(() => groupFieldsBySection(screenUiFields), [screenUiFields]);

  useEffect(() => {
    const syncMode = () => {
      setIsEnabled(isContentEditModeEnabled(window.localStorage));
    };

    syncMode();
    window.addEventListener("storage", syncMode);
    window.addEventListener("content-editor-mode-change", syncMode);

    return () => {
      window.removeEventListener("storage", syncMode);
      window.removeEventListener("content-editor-mode-change", syncMode);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextDraft: EditableContentOverrides = {};
    for (const field of screenFields) {
      nextDraft[field.key] = getEditableContentValue(snapshot, field.key);
    }
    setDraft(nextDraft);

    const nextUiDraft: EditableUiOverrides = {};
    for (const field of screenUiFields) {
      nextUiDraft[field.key] = getEditableUiValue(uiSnapshot, field.key);
    }
    setUiDraft(nextUiDraft);
  }, [isOpen, screenFields, screenUiFields, snapshot, uiSnapshot]);

  useEffect(() => {
    if (!isEnabled) {
      setInlineTarget(null);
      return;
    }

    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        target.closest(".content-editor-drawer") ||
        target.closest(".content-editor-toggle") ||
        target.closest(".content-inline-popover") ||
        target.closest("input, textarea, select, button")
      ) {
        return;
      }

      const keyedElement = resolveKeyedElement(target);
      if (keyedElement instanceof HTMLElement) {
        const keyedField = screenFields.find((field) => field.key === keyedElement.dataset.contentKey);
        if (keyedField) {
          setError(null);
          setInlineTarget(
            createInlineTarget(keyedField, keyedElement, getEditableContentValue(snapshot, keyedField.key), styleOverrides[keyedField.key])
          );
          return;
        }
      }

      const text = target.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (!text) {
        return;
      }

      const matchingFields = screenFields.filter((field) => {
        if (field.kind === "template") {
          return false;
        }

        return getEditableContentValue(snapshot, field.key).replace(/\s+/g, " ").trim() === text;
      });

      if (matchingFields.length !== 1) {
        return;
      }

      setError(null);
      setInlineTarget(
        createInlineTarget(matchingFields[0], target, getEditableContentValue(snapshot, matchingFields[0].key), styleOverrides[matchingFields[0].key])
      );
    };

    window.addEventListener("dblclick", handleDoubleClick);

    return () => {
      window.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [isEnabled, screenFields, snapshot, styleOverrides]);

  if (!isEnabled || (screenFields.length === 0 && screenUiFields.length === 0)) {
    return null;
  }

  function updateDraft(key: EditableContentKey, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateUiDraft(key: EditableUiKey, value: string) {
    setUiDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function resetField(key: EditableContentKey) {
    updateDraft(key, getDefaultEditableContentValue(key));
  }

  function resetUiField(key: EditableUiKey) {
    updateUiDraft(key, getDefaultEditableUiValue(key));
  }

  function updateInlineStyle(partial: Partial<InlineEditorStyleDraft>) {
    setInlineTarget((current) => (current ? { ...current, style: { ...current.style, ...partial } } : current));
  }

  function resetInlineStyle() {
    setInlineTarget((current) =>
      current
        ? {
            ...current,
            style: {
              fontSize: "",
              fontWeight: "normal",
              fontStyle: "normal"
            }
          }
        : current
    );
  }

  async function saveOverrides(
    overrides: EditableContentOverrides,
    nextUiOverrides: EditableUiOverrides = {},
    nextStyleOverrides: EditableContentStyleOverrides = {}
  ) {
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        overrides,
        uiOverrides: nextUiOverrides,
        styleOverrides: nextStyleOverrides
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = (await response.json()) as {
      snapshot: typeof snapshot;
      styleOverrides: typeof styleOverrides;
      uiSnapshot: typeof uiSnapshot;
    };

    setSnapshot(payload.snapshot);
    setStyleOverrides(payload.styleOverrides);
    setUiSnapshot(payload.uiSnapshot);
    router.refresh();
  }

  async function saveDraft() {
    try {
      setIsSaving(true);
      setError(null);
      await saveOverrides(draft, uiDraft);
      setIsOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה לשמור את ההגדרות.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveInlineTarget() {
    if (!inlineTarget) {
      return;
    }

    try {
      setIsInlineSaving(true);
      setError(null);
      await saveOverrides({
        [inlineTarget.field.key]: inlineTarget.value
      }, {}, {
        [inlineTarget.field.key]: normalizeInlineStyleDraft(inlineTarget.style)
      });
      setInlineTarget(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה לשמור את הטקסט.");
    } finally {
      setIsInlineSaving(false);
    }
  }

  function exitEditMode() {
    disableContentEditMode(window.localStorage);
    window.dispatchEvent(new Event("content-editor-mode-change"));
    setIsOpen(false);
    setInlineTarget(null);
  }

  const inlineFontSize = inlineTarget ? parseInlineFontSize(inlineTarget.style.fontSize) : 1;
  return (
    <>
      <button type="button" className="content-editor-toggle" onClick={() => setIsOpen(true)}>
        עריכת טקסטים
      </button>

      {inlineTarget ? (
        <div
          className="content-inline-popover"
          dir="rtl"
          tabIndex={-1}
          style={{
            top: `${inlineTarget.top}px`,
            left: `${inlineTarget.left}px`,
            transform: "translate(-50%, -50%)",
            width: `${inlineTarget.width}px`
          }}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;
            if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
              return;
            }

            void saveInlineTarget();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setInlineTarget(null);
              return;
            }

            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void saveInlineTarget();
            }
          }}
        >
          <label className="form-field">
            <span>{inlineTarget.field.label}</span>
            {inlineTarget.field.kind === "textarea" || inlineTarget.field.kind === "template" ? (
              <textarea
                autoFocus
                className="textarea-input"
                rows={3}
                value={inlineTarget.value}
                onChange={(event) =>
                  setInlineTarget((current) => (current ? { ...current, value: event.target.value } : current))
                }
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setInlineTarget(null);
                  }

                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    void saveInlineTarget();
                  }
                }}
              />
            ) : (
              <input
                autoFocus
                type="text"
                className="text-input"
                value={inlineTarget.value}
                onChange={(event) =>
                  setInlineTarget((current) => (current ? { ...current, value: event.target.value } : current))
                }
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setInlineTarget(null);
                  }

                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveInlineTarget();
                  }
                }}
              />
            )}
            {inlineTarget.field.requiredPlaceholders.length > 0 ? (
              <p className="questionnaire-note">
                שדות חובה בתבנית: {inlineTarget.field.requiredPlaceholders.map((placeholder) => `{${placeholder}}`).join(", ")}
              </p>
            ) : null}
            <p className="questionnaire-note">לחצו פעמיים על טקסט ייחודי כדי לערוך. לחיצה מחוץ לשדה תשמור אוטומטית.</p>
          </label>
          <div className="content-inline-formatting">
            <label className="form-field content-inline-format-field">
              <span>גודל טקסט</span>
              <div className="content-inline-format-range-row">
                <input
                  type="range"
                  className="content-inline-format-range"
                  min="0.6"
                  max="3.2"
                  step="0.05"
                  value={inlineFontSize}
                  onChange={(event) =>
                    updateInlineStyle({
                      fontSize: formatInlineFontSize(Number(event.target.value))
                    })
                  }
                />
                <output className="content-inline-format-value">{formatInlineFontSize(inlineFontSize)}</output>
              </div>
            </label>
            <div className="content-inline-format-buttons" role="group" aria-label="עיצוב טקסט">
              <button
                type="button"
                className={`button button-secondary content-inline-format-button ${inlineTarget.style.fontWeight === "bold" ? "is-active" : ""}`}
                onClick={() =>
                  updateInlineStyle({
                    fontWeight: inlineTarget.style.fontWeight === "bold" ? "normal" : "bold"
                  })
                }
              >
                Bold
              </button>
              <button
                type="button"
                className={`button button-secondary content-inline-format-button ${inlineTarget.style.fontStyle === "italic" ? "is-active" : ""}`}
                onClick={() =>
                  updateInlineStyle({
                    fontStyle: inlineTarget.style.fontStyle === "italic" ? "normal" : "italic"
                  })
                }
              >
                Italic
              </button>
              <button type="button" className="button button-secondary content-editor-reset" onClick={resetInlineStyle}>
                איפוס עיצוב
              </button>
            </div>
          </div>
          {isInlineSaving ? <p className="status">שומר...</p> : null}
        </div>
      ) : null}

      {isOpen ? (
        <aside className="content-editor-drawer" dir="rtl">
          <div className="content-editor-header">
            <div>
              <strong>מצב עריכה</strong>
              <p>אפשר לערוך כאן גם טקסטים וגם גדלי פונט. שדות NVLT משפיעים על כל המסך בבת אחת.</p>
            </div>
            <button type="button" className="button button-secondary" onClick={() => setIsOpen(false)}>
              סגירה
            </button>
          </div>

          <div className="content-editor-body">
            {groupedUiFields.map(([section, sectionFields]) => (
              <section key={`ui-${section}`} className="content-editor-group">
                <h3>{section}</h3>
                <div className="stack">
                  {sectionFields.map((field) => {
                    const value = uiDraft[field.key] ?? getEditableUiValue(uiSnapshot, field.key);

                    return (
                      <label key={field.key} className="form-field">
                        <span>{field.label}</span>
                        <input
                          type="text"
                          className="text-input"
                          value={value}
                          onChange={(event) => updateUiDraft(field.key, event.target.value)}
                        />
                        <p className="questionnaire-note">
                          {field.helperText ?? "השתמשו בערכים כמו 1rem, 18px או clamp(...)."}
                        </p>
                        <button type="button" className="button button-secondary content-editor-reset" onClick={() => resetUiField(field.key)}>
                          החזרת גודל זה לברירת המחדל
                        </button>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}

            {groupedFields.map(([section, sectionFields]) => (
              <section key={section} className="content-editor-group">
                <h3>{section}</h3>
                <div className="stack">
                  {sectionFields.map((field) => {
                    const value = draft[field.key] ?? getEditableContentValue(snapshot, field.key);

                    return (
                      <label key={field.key} className="form-field">
                        <span>{field.label}</span>
                        {field.kind === "textarea" || field.kind === "template" ? (
                          <textarea
                            className="textarea-input"
                            rows={3}
                            value={value}
                            onChange={(event) => updateDraft(field.key, event.target.value)}
                          />
                        ) : (
                          <input
                            type="text"
                            className="text-input"
                            value={value}
                            onChange={(event) => updateDraft(field.key, event.target.value)}
                          />
                        )}
                        {field.requiredPlaceholders.length > 0 ? (
                          <p className="questionnaire-note">
                            שדות חובה בתבנית: {field.requiredPlaceholders.map((placeholder) => `{${placeholder}}`).join(", ")}
                          </p>
                        ) : null}
                        <button type="button" className="button button-secondary content-editor-reset" onClick={() => resetField(field.key)}>
                          החזרת שדה זה לברירת המחדל
                        </button>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="content-editor-actions">
            <button type="button" className="button" onClick={saveDraft} disabled={isSaving}>
              {isSaving ? "שומר..." : "שמירה"}
            </button>
            <button type="button" className="button button-secondary" onClick={exitEditMode}>
              יציאה ממצב עריכה
            </button>
          </div>

          {error ? <p className="status">{error}</p> : null}
        </aside>
      ) : null}
    </>
  );
}
