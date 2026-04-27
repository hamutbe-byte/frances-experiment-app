import type { ReactNode } from "react";

interface StudyFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function StudyFrame({ eyebrow, title, description, children }: StudyFrameProps) {
  return (
    <main className="page-shell">
      <div className="page-inner stack">
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
