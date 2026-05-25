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
    <StudyFrame studySlug={study.slug} screen="matching" dir="rtl">
      <MatchingTaskClient studySlug={study.slug} />
    </StudyFrame>
  );
}
