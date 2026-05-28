"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getResolvedStudySessionId, getSessionBundleRequest, updateSessionStatusRequest } from "@/lib/session-client";
import type { SessionBundle, SessionStage } from "@/lib/types";

interface UseStudySessionBundleOptions {
  studySlug: string;
  stage: SessionStage;
  loadErrorMessage: string;
  stageErrorMessage: string;
}

interface UseStudySessionBundleResult {
  sessionId: string | null;
  bundle: SessionBundle | null;
  error: string | null;
  isResolvingSession: boolean;
}

export function useStudySessionBundle({
  studySlug,
  stage,
  loadErrorMessage,
  stageErrorMessage
}: UseStudySessionBundleOptions): UseStudySessionBundleResult {
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(searchParams.get("session"));
  const [bundle, setBundle] = useState<SessionBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResolvingSession, setIsResolvingSession] = useState(true);

  useEffect(() => {
    const resolvedSessionId = getResolvedStudySessionId(studySlug, searchParams);
    if (!resolvedSessionId) {
      setSessionId(null);
      setBundle(null);
      setIsResolvingSession(true);
      return;
    }

    setSessionId(resolvedSessionId);
    setIsResolvingSession(true);
    setError(null);
    setBundle(null);
    let cancelled = false;

    void getSessionBundleRequest(resolvedSessionId)
      .then((result) => {
        if (!cancelled) {
          setBundle(result);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : loadErrorMessage);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolvingSession(false);
        }
      });

    void updateSessionStatusRequest(resolvedSessionId, stage).catch((caughtError) => {
      if (!cancelled) {
        setError(caughtError instanceof Error ? caughtError.message : stageErrorMessage);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadErrorMessage, searchParams, stage, stageErrorMessage, studySlug]);

  return { sessionId, bundle, error, isResolvingSession };
}
