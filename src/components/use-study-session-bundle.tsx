"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getCachedSessionBundle,
  getResolvedStudySessionId,
  getSessionBundleRequest,
  updateSessionStatusRequest
} from "@/lib/session-client";
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
    const cachedBundle = getCachedSessionBundle<SessionBundle>(studySlug, resolvedSessionId);
    setError(null);
    if (cachedBundle) {
      setBundle(cachedBundle);
      setIsResolvingSession(false);
    } else {
      setBundle(null);
      setIsResolvingSession(true);
    }
    let cancelled = false;

    void getSessionBundleRequest(resolvedSessionId)
      .then((result) => {
        if (!cancelled) {
          setBundle(result);
          setIsResolvingSession(false);
        }
      })
      .catch((caughtError) => {
        if (!cancelled && !cachedBundle) {
          setError(caughtError instanceof Error ? caughtError.message : loadErrorMessage);
          setIsResolvingSession(false);
        }
      })
      .finally(() => {
        if (!cancelled && cachedBundle) {
          setIsResolvingSession(false);
        }
      });

    void updateSessionStatusRequest(resolvedSessionId, stage).catch((caughtError) => {
      if (!cancelled && !cachedBundle) {
        setError(caughtError instanceof Error ? caughtError.message : stageErrorMessage);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadErrorMessage, searchParams, stage, stageErrorMessage, studySlug]);

  return { sessionId, bundle, error, isResolvingSession };
}
