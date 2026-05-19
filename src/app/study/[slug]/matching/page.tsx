import { MatchingTaskClient } from "@/components/matching-task-client";
import { StudyFrame } from "@/components/study-frame";
import { getResolvedContentSnapshot } from "@/lib/content-server";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function MatchingPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);
  const content = getResolvedContentSnapshot();
  const appText = content.appText as typeof import("@/content/app-text").appText;

  return (
    <StudyFrame title={appText.study.pages.matchingTitle} studySlug={study.slug} screen="matching" dir="rtl">
      <MatchingTaskClient studySlug={study.slug} />
    </StudyFrame>
  );
}
