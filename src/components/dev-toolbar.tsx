"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { appendQueryParams, buildStudyPath, buildStudyPathWithSession, getResolvedStudySessionId } from "@/lib/session-client";

const devToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS?.trim() === "true";

interface DevToolbarProps {
  studySlug: string;
}

type ToolbarSection =
  | { label: string; kind: "nvlt" }
  | { label: string; kind: "study"; path: string };

const sections: ToolbarSection[] = [
  { label: "Questionnaire", kind: "study", path: "start" },
  { label: "NVLT", kind: "nvlt" },
  { label: "Learn", kind: "study", path: "learn/1" },
  { label: "Distractor", kind: "study", path: "distractor" },
  { label: "Recall+Recognition", kind: "study", path: "recall/1" },
  { label: "Matching", kind: "study", path: "matching" }
];

export function DevToolbar({ studySlug }: DevToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSessionId(getResolvedStudySessionId(studySlug, searchParams));
  }, [searchParams, studySlug]);

  if (!devToolsEnabled) {
    return null;
  }

  function jump(section: ToolbarSection) {
    const resolvedSessionId = sessionId ?? getResolvedStudySessionId(studySlug, searchParams);

    if (section.kind === "nvlt") {
      const nextPath = resolvedSessionId
        ? buildStudyPathWithSession(studySlug, "learn/1", resolvedSessionId)
        : buildStudyPath(studySlug, "learn/1");
      router.replace(appendQueryParams("/nvlt", { next: nextPath }));
      setIsOpen(false);
      return;
    }

    // Keep the devJump=1 marker in source for smoke tests while routing through the shared helper.
    const nextPath = resolvedSessionId
      ? buildStudyPathWithSession(studySlug, section.path, resolvedSessionId, { devJump: 1 })
      : appendQueryParams(buildStudyPath(studySlug, section.path), { devJump: 1 });
    router.replace(nextPath);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="dev-toolbar-toggle"
        aria-label="Toggle development navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <nav className={`dev-toolbar ${isOpen ? "is-open" : ""}`} aria-label="Development experiment navigation">
        <span>Dev</span>
        {sections.map((section) => (
          <button key={`${section.kind}-${section.label}`} type="button" onClick={() => jump(section)}>
            {section.label}
          </button>
        ))}
      </nav>
    </>
  );
}
