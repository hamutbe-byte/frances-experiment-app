import type { ReactNode } from "react";

import { DevToolbar } from "@/components/dev-toolbar";

interface StudyFrameProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  studySlug?: string;
  dir?: "ltr" | "rtl";
  children: ReactNode;
}

export function StudyFrame({ eyebrow, title, description, studySlug, dir = "ltr", children }: StudyFrameProps) {
  const hasHeroContent = Boolean(eyebrow || title || description);

  return (
    <main className="page-shell" dir={dir}>
      <div className="page-inner stack">
        {studySlug ? <DevToolbar studySlug={studySlug} /> : null}
        {hasHeroContent ? (
          <section className="hero">
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            {title ? <h1>{title}</h1> : null}
            {description ? <p>{description}</p> : null}
          </section>
        ) : null}
        {children}
      </div>
    </main>
  );
}
