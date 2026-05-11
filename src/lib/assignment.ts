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

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

export function seededShuffle(values: number[], seedText: string) {
  const random = makeRandom(hashSeed(seedText));
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function makeParticipantOrders(study: StudyData, sessionId: string) {
  return {
    recallPromptOrder: seededShuffle(
      study.recallPrompts.map((prompt) => prompt.promptIndex),
      `${sessionId}:recall`
    ),
    matchingTrialOrder: seededShuffle(
      study.matchingTrials.map((trial) => trial.trialIndex),
      `${sessionId}:matching`
    )
  };
}
