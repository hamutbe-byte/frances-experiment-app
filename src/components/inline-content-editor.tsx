"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { disableContentEditMode, isContentEditModeEnabled } from "@/lib/content-edit-mode";
import { getDefaultEditableContentValue, getEditableContentValue } from "@/lib/content";
import type { EditableContentKey, EditableContentOverrides, EditableContentScreen, EditableFieldDefinition } from "@/lib/types";

interface InlineContentEditorProps {
  screen: EditableContentScreen;
}

interface InlineEditorTarget {
  field: EditableFieldDefinition;
  value: string;
  top: number;
  left: number;
  width: number;
}

function groupFieldsBySection(fields: EditableFieldDefinition[]) {
  const groups = new Map<string, EditableFieldDefinition[]>();

  for (const field of fields) {
    const current = groups.get(field.section) ?? [];
    current.push(field);
    groups.set(field.section, current);
  }

  return [...groups.entries()];
}

export function InlineContentEditor({ screen }: InlineContentEditorProps) {
  const router = useRouter();
  const { snapshot, setSnapshot, fields } = useResolvedContent();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<EditableContentOverrides>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isInlineSaving, setIsInlineSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineTarget, setInlineTarget] = useState<InlineEditorTarget | null>(null);

  const screenFields = useMemo(() => fields.filter((field) => field.screen === screen), [fields, screen]);
  const groupedFields = useMemo(() => groupFieldsBySection(screenFields), [screenFields]);

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
  }, [isOpen, screenFields, snapshot]);

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

      const rect = target.getBoundingClientRect();
      const maxWidth = Math.min(420, window.innerWidth - 32);
      setError(null);
      setInlineTarget({
        field: matchingFields[0],
        value: getEditableContentValue(snapshot, matchingFields[0].key),
        top: Math.min(rect.bottom + 8, window.innerHeight - 160),
        left: Math.max(16, Math.min(rect.left, window.innerWidth - maxWidth - 16)),
        width: Math.max(240, Math.min(rect.width, maxWidth))
      });
    };

    window.addEventListener("dblclick", handleDoubleClick);

    return () => {
      window.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [isEnabled, screenFields, snapshot]);

  if (!isEnabled || screenFields.length === 0) {
    return null;
  }

  function updateDraft(key: EditableContentKey, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function resetField(key: EditableContentKey) {
    updateDraft(key, getDefaultEditableContentValue(key));
  }

  async function saveOverrides(overrides: EditableContentOverrides) {
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        overrides
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = (await response.json()) as { snapshot: typeof snapshot };
    setSnapshot(payload.snapshot);
    router.refresh();
  }

  async function saveDraft() {
    try {
      setIsSaving(true);
      setError(null);
      await saveOverrides(draft);
      setIsOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "לא ניתן היה לשמור את הטקסטים.");
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

  return (
    <>
      <button type="button" className="content-editor-toggle" onClick={() => setIsOpen(true)}>
        עריכת טקסטים
      </button>

      {inlineTarget ? (
        <div
          className="content-inline-popover"
          dir="rtl"
          style={{
            top: `${inlineTarget.top}px`,
            left: `${inlineTarget.left}px`,
            width: `${inlineTarget.width}px`
          }}
        >
          <label className="form-field">
            <span>{inlineTarget.field.label}</span>
            {inlineTarget.field.kind === "textarea" ? (
              <textarea
                autoFocus
                className="textarea-input"
                rows={3}
                value={inlineTarget.value}
                onChange={(event) =>
                  setInlineTarget((current) => (current ? { ...current, value: event.target.value } : current))
                }
                onBlur={() => {
                  void saveInlineTarget();
                }}
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
                onBlur={() => {
                  void saveInlineTarget();
                }}
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
            <p className="questionnaire-note">לחצו פעמיים על טקסט ייחודי כדי לערוך. לחיצה מחוץ לשדה תשמור אוטומטית.</p>
          </label>
          {isInlineSaving ? <p className="status">שומר...</p> : null}
        </div>
      ) : null}

      {isOpen ? (
        <aside className="content-editor-drawer" dir="rtl">
          <div className="content-editor-header">
            <div>
              <strong>מצב עריכה</strong>
              <p>הטקסטים במסך זה ניתנים לעריכה ושמירה מיידית. אפשר גם ללחוץ פעמיים על טקסט ייחודי במסך.</p>
            </div>
            <button type="button" className="button button-secondary" onClick={() => setIsOpen(false)}>
              סגירה
            </button>
          </div>

          <div className="content-editor-body">
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
