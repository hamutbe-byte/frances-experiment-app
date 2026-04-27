"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getCurrentSessionId } from "@/lib/session-client";

const devToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";

interface DevToolbarProps {
  studySlug: string;
}

const sections = [
  { label: "Start", path: "start" },
  { label: "Instructions", path: "instructions" },
  { label: "Learn", path: "learn/1" },
  { label: "Distractor", path: "distractor" },
  { label: "Recall", path: "recall/1" },
  { label: "Matching", path: "matching" },
  { label: "Complete", path: "complete" }
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

  function jump(path: string) {
    const query = sessionId ? `?session=${sessionId}` : "";
    router.push(`/study/${studySlug}/${path}${query}`);
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
          <button key={section.path} type="button" onClick={() => jump(section.path)}>
            {section.label}
          </button>
        ))}
      </nav>
    </>
  );
}
