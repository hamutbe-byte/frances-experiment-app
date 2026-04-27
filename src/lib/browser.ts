import type { DeviceSnapshot } from "@/lib/types";

export function getDeviceSnapshot(): DeviceSnapshot {
  const userAgent = navigator.userAgent;
  const width = window.innerWidth;
  const deviceType = width < 768 ? "mobile" : width < 1100 ? "tablet" : "desktop";

  return {
    userAgent,
    viewportWidth: width,
    viewportHeight: window.innerHeight,
    language: navigator.language,
    platform: navigator.platform,
    deviceType,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

export function plainTextFromHtml(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}
