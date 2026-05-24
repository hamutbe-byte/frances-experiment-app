"use client";

import { useMemo, type CSSProperties, type ElementType, type ReactNode } from "react";

import { useResolvedContent } from "@/components/content-provider";
import type { EditableContentKey } from "@/lib/types";

interface EditableContentTextProps {
  contentKey: EditableContentKey;
  children: ReactNode;
  tag?: ElementType;
  className?: string;
}

export function EditableContentText({ contentKey, children, tag = "span", className }: EditableContentTextProps) {
  const { styleOverrides } = useResolvedContent();
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

  return (
    <Tag className={className} data-content-key={contentKey} style={resolvedStyle}>
      {children}
    </Tag>
  );
}
