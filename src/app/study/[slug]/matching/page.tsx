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
      eyebrow="שלב ההתאמה"
      title="התאמת תמונה-מילה"
      description="החליטו במהירות ובדיוק ככל האפשר אם כל תמונה ומילת פסאודו באנגלית מתאימות זו לזו."
      studySlug={study.slug}
      dir="rtl"
    >
      <MatchingTaskClient studySlug={study.slug} />
    </StudyFrame>
  );
}
