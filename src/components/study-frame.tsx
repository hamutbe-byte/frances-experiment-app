import type { ReactNode } from "react";

import { DevToolbar } from "@/components/dev-toolbar";

interface StudyFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  studySlug?: string;
  dir?: "ltr" | "rtl";
  children: ReactNode;
}

export function StudyFrame({ eyebrow, title, description, studySlug, dir = "ltr", children }: StudyFrameProps) {
  return (
    <main className="page-shell" dir={dir}>
      <div className="page-inner stack">
        {studySlug ? <DevToolbar studySlug={studySlug} /> : null}
        <section className="hero">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </section>
        {children}
      </div>
    </main>
  );
}
