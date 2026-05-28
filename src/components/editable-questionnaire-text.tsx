"use client";

import type { ElementType, ReactNode } from "react";

import { EditableContentText } from "@/components/editable-content-text";
import type { EditableContentKey } from "@/lib/types";

interface EditableQuestionnaireTextProps {
  contentKey: EditableContentKey;
  children: ReactNode;
  tag?: ElementType;
  className?: string;
  dir?: "ltr" | "rtl";
  lang?: string;
}

export function EditableQuestionnaireText({
  contentKey,
  children,
  tag = "span",
  className,
  dir,
  lang
}: EditableQuestionnaireTextProps) {
  return (
    <EditableContentText contentKey={contentKey} tag={tag} className={className} dir={dir} lang={lang}>
      {children}
    </EditableContentText>
  );
}
