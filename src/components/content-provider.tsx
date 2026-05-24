"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { defaultContentSnapshot, editableFieldDefinitions } from "@/lib/content";
import { defaultUiSnapshot, editableUiFieldDefinitions, getUiCssVariables } from "@/content/ui-config";
import type {
  EditableFieldDefinition,
  EditableUiFieldDefinition,
  ResolvedContentSnapshot,
  ResolvedUiSnapshot
} from "@/lib/types";

interface ContentContextValue {
  snapshot: ResolvedContentSnapshot;
  setSnapshot: (snapshot: ResolvedContentSnapshot) => void;
  fields: EditableFieldDefinition[];
  uiSnapshot: ResolvedUiSnapshot;
  setUiSnapshot: (snapshot: ResolvedUiSnapshot) => void;
  uiFields: EditableUiFieldDefinition[];
}

const ContentContext = createContext<ContentContextValue | null>(null);

interface ContentProviderProps {
  initialSnapshot: ResolvedContentSnapshot;
  initialUiSnapshot: ResolvedUiSnapshot;
  children: ReactNode;
}

export function ContentProvider({ initialSnapshot, initialUiSnapshot, children }: ContentProviderProps) {
  const [snapshot, setSnapshot] = useState<ResolvedContentSnapshot>(initialSnapshot);
  const [uiSnapshot, setUiSnapshot] = useState<ResolvedUiSnapshot>(initialUiSnapshot);

  useEffect(() => {
    const cssVariables = getUiCssVariables(uiSnapshot);

    Object.entries(cssVariables).forEach(([key, value]) => {
      if (typeof value === "string") {
        document.body.style.setProperty(key, value);
      }
    });
  }, [uiSnapshot]);

  const value = useMemo<ContentContextValue>(
    () => ({
      snapshot,
      setSnapshot,
      fields: editableFieldDefinitions,
      uiSnapshot,
      setUiSnapshot,
      uiFields: editableUiFieldDefinitions
    }),
    [snapshot, uiSnapshot]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useResolvedContent() {
  const context = useContext(ContentContext);
  if (!context) {
    return {
      snapshot: defaultContentSnapshot,
      setSnapshot: () => undefined,
      fields: editableFieldDefinitions,
      uiSnapshot: defaultUiSnapshot,
      setUiSnapshot: () => undefined,
      uiFields: editableUiFieldDefinitions
    } satisfies ContentContextValue;
  }

  return context;
}
