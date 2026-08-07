"use client";

import { useMemo, type CSSProperties, type ElementType, type ReactNode } from "react";

import { useResolvedContent } from "@/components/content-provider";
import { getEditableContentValue } from "@/lib/content";
import type { EditableContentKey } from "@/lib/types";

interface EditableContentTextProps {
  contentKey: EditableContentKey;
  children?: ReactNode;
  tag?: ElementType;
  className?: string;
  dir?: "ltr" | "rtl";
  lang?: string;
  dangerouslySetInnerHTML?: { __html: string };
}

export function EditableContentText({
  contentKey,
  children,
  tag = "span",
  className,
  dir,
  lang,
  dangerouslySetInnerHTML
}: EditableContentTextProps) {
  const { snapshot, styleOverrides } = useResolvedContent();
  const style = styleOverrides[contentKey];
  const resolvedStyle = useMemo<CSSProperties | undefined>(() => {
    if (!style || Object.keys(style).length === 0) {
      return undefined;
    }

    return {
      ...(style.fontSize ? { fontSize: style.fontSize } : {}),
      ...(style.fontWeight ? { fontWeight: style.fontWeight } : {}),
      ...(style.fontStyle ? { fontStyle: style.fontStyle } : {})
    };
  }, [style]);

  const Tag = tag;
  // Style-only keys have no text value, so keep their runtime children intact.
  const resolvedText = getEditableContentValue(snapshot, contentKey);
  const resolvedChildren = resolvedText || children;

  return (
    dangerouslySetInnerHTML ? (
      <Tag
        className={className}
        data-content-key={contentKey}
        dir={dir}
        lang={lang}
        style={resolvedStyle}
        dangerouslySetInnerHTML={dangerouslySetInnerHTML}
      />
    ) : (
      <Tag className={className} data-content-key={contentKey} dir={dir} lang={lang} style={resolvedStyle}>
        {resolvedChildren}
      </Tag>
    )
  );
}
