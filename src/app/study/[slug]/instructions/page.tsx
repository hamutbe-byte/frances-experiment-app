import { InstructionsClient } from "@/components/instructions-client";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function InstructionsPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame
      eyebrow="Instructions"
      title="Before you begin"
      description="Please read each passage carefully and answer the short comprehension statement that follows. This build includes the training phase only."
      studySlug={study.slug}
    >
      <InstructionsClient studySlug={study.slug} />
    </StudyFrame>
  );
}
