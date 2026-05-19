import { InstructionsClient } from "@/components/instructions-client";
import { StudyFrame } from "@/components/study-frame";
import { getResolvedContentSnapshot } from "@/lib/content-server";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function InstructionsPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);
  const content = getResolvedContentSnapshot();
  const instructionText = content.instructionText as typeof import("@/content/instruction-text").instructionText;

  return (
    <StudyFrame
      title={instructionText.study.instructionsPage.title}
      description={instructionText.study.instructionsPage.subtitle}
      studySlug={study.slug}
      screen="instructions"
      dir="rtl"
    >
      <InstructionsClient studySlug={study.slug} />
    </StudyFrame>
  );
}
