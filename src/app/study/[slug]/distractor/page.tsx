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
      eyebrow="Break"
      title="Short distractor break"
      description="The original experiment included a timed distractor task before the memory questions."
      studySlug={study.slug}
    >
      <DistractorClient studySlug={study.slug} />
    </StudyFrame>
  );
}
