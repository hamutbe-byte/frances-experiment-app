"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getDeviceSnapshot } from "@/lib/browser";
import {
  appendSessionToPath,
  clearCurrentSessionId,
  createSessionRequest,
  getCurrentSessionId,
  getSessionBundleRequest,
  saveCurrentSessionId
} from "@/lib/session-client";

interface StudySessionBootstrapProps {
  studySlug: string;
}

export function StudySessionBootstrap({ studySlug }: StudySessionBootstrapProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didBootstrapRef = useRef(false);

  useEffect(() => {
    if (didBootstrapRef.current) {
      return;
    }

    let cancelled = false;
    const currentSessionId = searchParams.get("session");
    const storedSessionId = getCurrentSessionId(studySlug);
    const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    if (currentSessionId) {
      didBootstrapRef.current = true;
      if (storedSessionId !== currentSessionId) {
        saveCurrentSessionId(studySlug, currentSessionId);
      }
      return;
    }

    if (storedSessionId) {
      didBootstrapRef.current = true;
      void getSessionBundleRequest(storedSessionId)
        .then(() => {
          if (cancelled) {
            return;
          }

          saveCurrentSessionId(studySlug, storedSessionId);
          router.replace(appendSessionToPath(currentPath, storedSessionId));
        })
        .catch(() => {
          clearCurrentSessionId(studySlug);
          void createSessionRequest(studySlug, getDeviceSnapshot(), null)
            .then((result) => {
              if (cancelled) {
                return;
              }

              saveCurrentSessionId(studySlug, result.session.id);
              router.replace(appendSessionToPath(currentPath, result.session.id));
            })
            .catch(() => {
              didBootstrapRef.current = false;
            });
        });
      return;
    }

    didBootstrapRef.current = true;

    void createSessionRequest(studySlug, getDeviceSnapshot(), null)
      .then((result) => {
        if (cancelled) {
          return;
        }

        saveCurrentSessionId(studySlug, result.session.id);
        router.replace(appendSessionToPath(currentPath, result.session.id));
      })
      .catch(() => {
        didBootstrapRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams, studySlug]);

  return null;
}
