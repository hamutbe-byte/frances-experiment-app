import { CompletePhaseClient } from "@/components/complete-phase-client";
import { StudyFrame } from "@/components/study-frame";
import { getResolvedContentSnapshot } from "@/lib/content-server";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CompletePage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);
  const content = getResolvedContentSnapshot();
  const appText = content.appText as typeof import("@/content/app-text").appText;

  return (
    <StudyFrame title={appText.study.pages.completeTitle} studySlug={study.slug} screen="complete" dir="rtl">
      <CompletePhaseClient studySlug={study.slug} />
    </StudyFrame>
  );
}
