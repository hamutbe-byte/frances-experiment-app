import { MatchingPlaceholderClient } from "@/components/matching-placeholder-client";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function MatchingPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame
      eyebrow="Matching"
      title="Picture-word matching"
      description="This planned task will ask whether each picture and pseudoword match."
      studySlug={study.slug}
    >
      <MatchingPlaceholderClient studySlug={study.slug} trialCount={study.matchingTrials.length} />
    </StudyFrame>
  );
}
