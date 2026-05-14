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
    <StudyFrame studySlug={study.slug} dir="rtl">
      <DistractorClient studySlug={study.slug} />
    </StudyFrame>
  );
}
