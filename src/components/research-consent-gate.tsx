"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EditableContentText } from "@/components/editable-content-text";
import { StartPhaseClient } from "@/components/start-phase-client";
import { researchConsentText } from "@/content/research-consent-text";
import { buildStudyPath } from "@/lib/session-client";

interface ResearchConsentGateProps {
  studySlug: string;
  alwaysShow?: boolean;
}

export function ResearchConsentGate({ studySlug, alwaysShow = false }: ResearchConsentGateProps) {
  const router = useRouter();
  const storageKey = `research-consent-v1:${studySlug}`;
  const [hasConsented, setHasConsented] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(storageKey) === "accepted";
  });

  if (hasConsented && !alwaysShow) {
    return <StartPhaseClient studySlug={studySlug} />;
  }

  return (
    <section className="consent-card panel">
      <EditableContentText contentKey="researchConsentText.title" tag="h1">
        {researchConsentText.title}
      </EditableContentText>
      <article className="consent-document" dir="rtl">
        <EditableContentText contentKey="researchConsentText.greeting" tag="p">{researchConsentText.greeting}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.studyDescription" tag="p">{researchConsentText.studyDescription}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.voluntaryParticipation" tag="p">{researchConsentText.voluntaryParticipation}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.privacy" tag="p">{researchConsentText.privacy}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.confirmation" tag="p">{researchConsentText.confirmation}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.thanks" tag="p" className="consent-thanks">{researchConsentText.thanks}</EditableContentText>
      </article>
      <div className="actions consent-actions">
        <button
          type="button"
          className="button"
          onClick={() => {
            window.sessionStorage.setItem(storageKey, "accepted");
            setHasConsented(true);
            if (alwaysShow) {
              router.push(buildStudyPath(studySlug, "start"));
            }
          }}
        >
          <EditableContentText contentKey="researchConsentText.acceptButton" tag="span">
            {researchConsentText.acceptButton}
          </EditableContentText>
        </button>
      </div>
    </section>
  );
}
