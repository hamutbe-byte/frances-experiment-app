import { InstructionsClient } from "@/components/instructions-client";
import { instructionText } from "@/content/instruction-text";
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
      title={instructionText.study.instructionsPage.title}
      description={instructionText.study.instructionsPage.subtitle}
      studySlug={study.slug}
      dir="rtl"
    >
      <InstructionsClient studySlug={study.slug} />
    </StudyFrame>
  );
}
