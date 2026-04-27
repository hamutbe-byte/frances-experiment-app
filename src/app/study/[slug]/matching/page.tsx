import { MatchingTaskClient } from "@/components/matching-task-client";
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
      description="Decide as quickly and accurately as possible whether each picture and pseudoword match."
      studySlug={study.slug}
    >
      <MatchingTaskClient studySlug={study.slug} />
    </StudyFrame>
  );
}
