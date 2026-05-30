"use client";

import type { ElementType, ReactNode } from "react";

import { EditableQuestionnaireText } from "@/components/editable-questionnaire-text";
import type { EditableContentKey } from "@/lib/types";

interface QuestionnairePromptTextProps {
  contentKey: EditableContentKey;
  children: ReactNode;
  tag?: ElementType;
  className?: string;
  dir?: "ltr" | "rtl";
  lang?: string;
}

export function QuestionnairePromptText({
  contentKey,
  children,
  tag = "span",
  className,
  dir,
  lang
}: QuestionnairePromptTextProps) {
  const resolvedClassName = ["questionnaire-prompt", className].filter(Boolean).join(" ");

  return (
    <EditableQuestionnaireText contentKey={contentKey} tag={tag} className={resolvedClassName} dir={dir} lang={lang}>
      {children}
    </EditableQuestionnaireText>
  );
}
