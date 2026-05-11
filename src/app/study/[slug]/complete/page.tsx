import { CompletePhaseClient } from "@/components/complete-phase-client";
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
    <StudyFrame
      eyebrow="סיום"
      title="הניסוי הושלם"
      description="תודה על השלמת כל שלבי הניסוי."
      studySlug={study.slug}
      dir="rtl"
    >
      <CompletePhaseClient studySlug={study.slug} />
    </StudyFrame>
  );
}
