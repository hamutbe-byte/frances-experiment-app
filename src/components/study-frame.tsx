import { Suspense, type ReactNode } from "react";

import { DevToolbar } from "@/components/dev-toolbar";
import { EditableContentText } from "@/components/editable-content-text";
import { InlineContentEditor } from "@/components/inline-content-editor";
import { StudySessionBootstrap } from "@/components/study-session-bootstrap";
import type { EditableContentKey, EditableContentScreen } from "@/lib/types";

interface StudyFrameProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  descriptionNode?: ReactNode;
  studySlug?: string;
  screen?: EditableContentScreen;
  dir?: "ltr" | "rtl";
  children: ReactNode;
}

export function StudyFrame({
  eyebrow,
  title,
  description,
  descriptionNode,
  studySlug,
  screen,
  dir = "ltr",
  children
}: StudyFrameProps) {
  const hasHeroContent = Boolean(eyebrow || title || description || descriptionNode);

  return (
    <main className="page-shell" dir={dir}>
      <div className="page-inner stack">
        {studySlug ? (
          <Suspense fallback={null}>
            <StudySessionBootstrap studySlug={studySlug} />
          </Suspense>
        ) : null}
        {studySlug ? (
          <Suspense fallback={null}>
            <DevToolbar studySlug={studySlug} />
          </Suspense>
        ) : null}
        {screen ? <InlineContentEditor screen={screen} /> : null}
        {hasHeroContent ? (
          <section className="hero">
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            {title ? <h1>{title}</h1> : null}
            {descriptionNode ?? (description ? <p>{description}</p> : null)}
          </section>
        ) : null}
        {children}
      </div>
    </main>
  );
}
