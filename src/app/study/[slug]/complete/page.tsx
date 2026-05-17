import { CompletePhaseClient } from "@/components/complete-phase-client";
import { appText } from "@/content/app-text";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CompletePage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame title={appText.study.pages.completeTitle} studySlug={study.slug} dir="rtl">
      <CompletePhaseClient studySlug={study.slug} />
    </StudyFrame>
  );
}
