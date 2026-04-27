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
      eyebrow="Learning Trial"
      title="Read and respond"
      description="Keep the passage on screen, read it at your normal pace, and then answer the comprehension check."
      studySlug={study.slug}
    >
      <LearningTrialClient studySlug={study.slug} trialIndex={Number(trial)} />
    </StudyFrame>
  );
}
