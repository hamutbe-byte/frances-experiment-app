import rawStudy from "@/data/generated/frances-study.json";
import type { StudyData } from "@/lib/types";

const study = rawStudy as StudyData;

export function getStudy(slug: string): StudyData | null {
  return study.slug === slug ? study : null;
}

export function getStudyOrThrow(slug: string): StudyData {
  const found = getStudy(slug);
  if (!found) {
    throw new Error(`Study ${slug} was not found.`);
  }
  return found;
}

export function getDefaultStudySlug(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_STUDY_SLUG?.trim() || study.slug;
}

export function getVersionOrThrow(studySlug: string, versionId: string) {
  const found = getStudyOrThrow(studySlug).versions.find((version) => version.id === versionId);
  if (!found) {
    throw new Error(`Version ${versionId} was not found for study ${studySlug}.`);
  }
  return found;
}

export function getLearningTrialOrThrow(studySlug: string, versionId: string, trialIndex: number) {
  const version = getVersionOrThrow(studySlug, versionId);
  const trial = version.learningTrials.find((entry) => entry.trialIndex === trialIndex);
  if (!trial) {
    throw new Error(`Learning trial ${trialIndex} was not found in ${versionId}.`);
  }
  return trial;
}

export function getLearningTrialCount(studySlug: string, versionId: string) {
  return getVersionOrThrow(studySlug, versionId).learningTrials.length;
}

export function getRecallPromptOrThrow(studySlug: string, promptIndex: number) {
  const prompt = getStudyOrThrow(studySlug).recallPrompts.find((entry) => entry.promptIndex === promptIndex);
  if (!prompt) {
    throw new Error(`Recall prompt ${promptIndex} was not found for study ${studySlug}.`);
  }
  return prompt;
}

export function getRecallPromptCount(studySlug: string) {
  return getStudyOrThrow(studySlug).recallPrompts.length;
}

export function getMatchingTrialOrThrow(studySlug: string, trialIndex: number) {
  const trial = getStudyOrThrow(studySlug).matchingTrials.find((entry) => entry.trialIndex === trialIndex);
  if (!trial) {
    throw new Error(`Matching trial ${trialIndex} was not found for study ${studySlug}.`);
  }
  return trial;
}

export function getMatchingTrialCount(studySlug: string) {
  return getStudyOrThrow(studySlug).matchingTrials.length;
}
