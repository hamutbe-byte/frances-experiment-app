"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getDeviceSnapshot } from "@/lib/browser";
import {
  appendSessionToPath,
  clearCurrentSessionId,
  createSessionRequest,
  getCurrentSessionId,
  getResumableSessionId,
  getSessionBundleRequest,
  saveCurrentSessionId
} from "@/lib/session-client";

interface StudySessionBootstrapProps {
  studySlug: string;
}

const devToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS?.trim() === "true";

export function StudySessionBootstrap({ studySlug }: StudySessionBootstrapProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeBootstrapKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const bootstrapKey = `${studySlug}:${pathname}?${searchParams.toString()}`;
    if (activeBootstrapKeyRef.current === bootstrapKey) {
      return;
    }

    activeBootstrapKeyRef.current = bootstrapKey;
    let cancelled = false;
    const currentSessionId = searchParams.get("session");
    const storedSessionId = getResumableSessionId(studySlug);
    const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    if (devToolsEnabled) {
      const resolveDevSession = async () => {
        let resolvedSessionId = currentSessionId ?? storedSessionId;

        if (resolvedSessionId) {
          try {
            await getSessionBundleRequest(resolvedSessionId);
          } catch {
            resolvedSessionId = null;
            clearCurrentSessionId(studySlug);
          }
        }

        if (!resolvedSessionId) {
          const result = await createSessionRequest(studySlug, getDeviceSnapshot(), null);
          resolvedSessionId = result.session.id;
          saveCurrentSessionId(studySlug, resolvedSessionId);
        }

        if (cancelled) {
          return;
        }

        if (!currentSessionId) {
          router.replace(appendSessionToPath(currentPath, resolvedSessionId));
          return;
        }

        if (storedSessionId !== resolvedSessionId) {
          saveCurrentSessionId(studySlug, resolvedSessionId);
        }
      };

      void resolveDevSession().catch(() => {
        activeBootstrapKeyRef.current = null;
      });
      return () => {
        cancelled = true;
      };
    }

    if (currentSessionId) {
      if (getCurrentSessionId(studySlug) !== currentSessionId) {
        saveCurrentSessionId(studySlug, currentSessionId);
      }
      return;
    }

    if (storedSessionId) {
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
              activeBootstrapKeyRef.current = null;
            });
        });
      return;
    }

    void createSessionRequest(studySlug, getDeviceSnapshot(), null)
      .then((result) => {
        if (cancelled) {
          return;
        }

        saveCurrentSessionId(studySlug, result.session.id);
        router.replace(appendSessionToPath(currentPath, result.session.id));
      })
      .catch(() => {
        activeBootstrapKeyRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams, studySlug]);

  return null;
}
