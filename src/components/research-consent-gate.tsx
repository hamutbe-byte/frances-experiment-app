"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
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
  const { snapshot } = useResolvedContent();
  const consentText = snapshot.researchConsentText as typeof researchConsentText;
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
        {consentText.title}
      </EditableContentText>
      <article className="consent-document" dir="rtl">
        <EditableContentText contentKey="researchConsentText.greeting" tag="p">{consentText.greeting}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.studyDescription" tag="p">{consentText.studyDescription}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.voluntaryParticipation" tag="p">{consentText.voluntaryParticipation}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.privacy" tag="p">{consentText.privacy}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.confirmation" tag="p">{consentText.confirmation}</EditableContentText>
        <EditableContentText contentKey="researchConsentText.thanks" tag="p" className="consent-thanks">{consentText.thanks}</EditableContentText>
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
            {consentText.acceptButton}
          </EditableContentText>
        </button>
      </div>
    </section>
  );
}
