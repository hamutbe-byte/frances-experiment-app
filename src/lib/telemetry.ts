"use client";

import { useEffect, useRef } from "react";

import { getDeviceSnapshot } from "@/lib/browser";
import { sendTelemetryRequest } from "@/lib/session-client";
import type { ClientEvent, SessionStage } from "@/lib/types";

const telemetryEnabled = process.env.NEXT_PUBLIC_ENABLE_TELEMETRY === "true";

export function useStageTelemetry(sessionId: string | null, stage: SessionStage) {
  const latestRef = useRef({
    sessionId,
    stage
  });
  const resizeTimeoutRef = useRef<number | null>(null);
  const lastViewportRef = useRef<string>("");

  useEffect(() => {
    latestRef.current = {
      sessionId,
      stage
    };
  }, [sessionId, stage]);

  function sendEvent(
    eventType: ClientEvent["eventType"],
    payload: Record<string, string | number | boolean | null>
  ) {
    const latest = latestRef.current;
    if (!latest.sessionId) {
      return;
    }

    void sendTelemetryRequest(latest.sessionId, {
      stage: latest.stage,
      eventType,
      payload
    });
  }

  useEffect(() => {
    if (!telemetryEnabled) {
      return;
    }

    if (!sessionId) {
      return;
    }

    const onVisibility = () => {
      sendEvent(document.visibilityState === "hidden" ? "visibility_hidden" : "visibility_visible", {
        visibilityState: document.visibilityState
      });
    };

    const onFocus = () => sendEvent("focus_gained", {});
    const onBlur = () => sendEvent("focus_lost", {});
    const onResize = () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = window.setTimeout(() => {
        const device = getDeviceSnapshot();
        const key = `${device.viewportWidth}x${device.viewportHeight}:${device.deviceType}`;
        if (lastViewportRef.current === key) {
          return;
        }

        lastViewportRef.current = key;
        sendEvent("resize", {
          width: device.viewportWidth,
          height: device.viewportHeight,
          deviceType: device.deviceType
        });
      }, 200);
    };
    const onBeforeUnload = () => {
      sendEvent("navigation_attempt", {
        reason: "beforeunload"
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", onResize);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [sessionId]);
}
