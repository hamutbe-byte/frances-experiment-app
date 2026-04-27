import type { ParticipantSession, StudyData } from "@/lib/types";

export function chooseBalancedVersion(study: StudyData, sessions: ParticipantSession[]) {
  const counts = new Map<string, number>();

  for (const version of study.versions) {
    counts.set(version.id, 0);
  }

  for (const session of sessions) {
    if (session.studySlug !== study.slug) {
      continue;
    }
    counts.set(session.versionId, (counts.get(session.versionId) ?? 0) + 1);
  }

  return [...study.versions]
    .sort((left, right) => {
      const countDelta = (counts.get(left.id) ?? 0) - (counts.get(right.id) ?? 0);
      if (countDelta !== 0) {
        return countDelta;
      }
      return left.versionNumber - right.versionNumber;
    })[0];
}

export function makeCompletionCode(sessionId: string): string {
  return `FRANCES-${sessionId.slice(0, 8).toUpperCase()}`;
}

export function makeSessionId(): string {
  const entropy = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}${entropy}`;
}
