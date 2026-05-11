import { DistractorClient } from "@/components/distractor-client";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function DistractorPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame
      eyebrow="משימת הסחה"
      title="משימת קורסי"
      description="השלימו רצפים חזותיים קדימה ואחורה במשך 10 דקות לפני תחילת שאלות הזיכרון."
      studySlug={study.slug}
      dir="rtl"
    >
      <DistractorClient studySlug={study.slug} />
    </StudyFrame>
  );
}
