import { LearningTrialClient } from "@/components/learning-trial-client";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
    trial: string;
  }>;
}

export default async function LearningTrialPage({ params }: Props) {
  const { slug, trial } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame
      studySlug={study.slug}
      dir="rtl"
    >
      <LearningTrialClient studySlug={study.slug} trialIndex={Number(trial)} />
    </StudyFrame>
  );
}
