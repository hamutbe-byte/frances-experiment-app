"use client";

import type { ElementType, ReactNode } from "react";

import { EditableContentText } from "@/components/editable-content-text";
import type { EditableContentKey } from "@/lib/types";

interface BilingualInstructionTextProps {
  labelContentKey: EditableContentKey;
  englishContentKey: EditableContentKey;
  label: ReactNode;
  english: ReactNode;
  labelTag?: ElementType;
  englishTag?: ElementType;
  labelClassName?: string;
  englishClassName?: string;
  englishDir?: "ltr" | "rtl";
  englishLang?: string;
}

export function BilingualInstructionText({
  labelContentKey,
  englishContentKey,
  label,
  english,
  labelTag = "span",
  englishTag = "p",
  labelClassName,
  englishClassName = "instruction-english",
  englishDir = "ltr",
  englishLang = "en"
}: BilingualInstructionTextProps) {
  return (
    <>
      <EditableContentText contentKey={labelContentKey} tag={labelTag} className={labelClassName}>
        {label}
      </EditableContentText>
      <EditableContentText
        contentKey={englishContentKey}
        tag={englishTag}
        className={englishClassName}
        dir={englishDir}
        lang={englishLang}
      >
        {english}
      </EditableContentText>
    </>
  );
}
