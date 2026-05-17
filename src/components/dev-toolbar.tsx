"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getCurrentSessionId } from "@/lib/session-client";

const devToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";

interface DevToolbarProps {
  studySlug: string;
}

type ToolbarSection =
  | { label: string; kind: "home" }
  | { label: string; kind: "nvlt" }
  | { label: string; kind: "study"; path: string };

const sections: ToolbarSection[] = [
  { label: "Home", kind: "home" },
  { label: "Questionnaire", kind: "study", path: "start" },
  { label: "NVLT", kind: "nvlt" },
  { label: "Instructions", kind: "study", path: "instructions" },
  { label: "Learn", kind: "study", path: "learn/1" },
  { label: "Distractor", kind: "study", path: "distractor" },
  { label: "Recall+Recognition", kind: "study", path: "recall/1" },
  { label: "Matching", kind: "study", path: "matching" },
  { label: "Complete", kind: "study", path: "complete" }
];

export function DevToolbar({ studySlug }: DevToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSessionId(searchParams.get("session") ?? getCurrentSessionId(studySlug));
  }, [searchParams, studySlug]);

  if (!devToolsEnabled) {
    return null;
  }

  function jump(section: ToolbarSection) {
    const resolvedSessionId = searchParams.get("session") ?? sessionId ?? getCurrentSessionId(studySlug);

    if (section.kind === "home") {
      router.replace("/");
      setIsOpen(false);
      return;
    }

    if (section.kind === "nvlt") {
      const nextPath = resolvedSessionId ? `/study/${studySlug}/instructions?session=${encodeURIComponent(resolvedSessionId)}` : `/study/${studySlug}/instructions`;
      router.replace(`/nvlt?next=${encodeURIComponent(nextPath)}`);
      setIsOpen(false);
      return;
    }

    const query = resolvedSessionId ? `?session=${encodeURIComponent(resolvedSessionId)}&devJump=1` : "?devJump=1";
    router.replace(`/study/${studySlug}/${section.path}${query}`);
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
