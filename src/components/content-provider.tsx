"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { defaultContentSnapshot, editableFieldDefinitions } from "@/lib/content";
import type { EditableFieldDefinition, ResolvedContentSnapshot } from "@/lib/types";

interface ContentContextValue {
  snapshot: ResolvedContentSnapshot;
  setSnapshot: (snapshot: ResolvedContentSnapshot) => void;
  fields: EditableFieldDefinition[];
}

const ContentContext = createContext<ContentContextValue | null>(null);

interface ContentProviderProps {
  initialSnapshot: ResolvedContentSnapshot;
  children: ReactNode;
}

export function ContentProvider({ initialSnapshot, children }: ContentProviderProps) {
  const [snapshot, setSnapshot] = useState<ResolvedContentSnapshot>(initialSnapshot);

  const value = useMemo<ContentContextValue>(
    () => ({
      snapshot,
      setSnapshot,
      fields: editableFieldDefinitions
    }),
    [snapshot]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useResolvedContent() {
  const context = useContext(ContentContext);
  if (!context) {
    return {
      snapshot: defaultContentSnapshot,
      setSnapshot: () => undefined,
      fields: editableFieldDefinitions
    } satisfies ContentContextValue;
  }

  return context;
}
