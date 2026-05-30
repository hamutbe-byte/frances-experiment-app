import { BilingualInstructionText } from "@/components/bilingual-instruction-text";
import { RecallRecognitionClient } from "@/components/recall-recognition-client";
import { StudyFrame } from "@/components/study-frame";
import { getResolvedContentSnapshot } from "@/lib/content-server";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
    prompt: string;
  }>;
}

export default async function RecallPage({ params }: Props) {
  const { slug, prompt } = await params;
  const study = getStudyOrThrow(slug);
  const content = getResolvedContentSnapshot();
  const instructionText = content.instructionText as typeof import("@/content/instruction-text").instructionText;

  return (
    <StudyFrame
      descriptionNode={
        <BilingualInstructionText
          labelContentKey="instructionText.study.recall.recallInputLabel"
          englishContentKey="instructionText.study.recall.recallInputLabelEnglish"
          label={instructionText.study.recall.recallInputLabel}
          english={instructionText.study.recall.recallInputLabelEnglish}
          labelClassName="recall-page-subtitle-label"
          englishClassName="instruction-english recall-page-subtitle-english"
        />
      }
      studySlug={study.slug}
      screen="recall"
      dir="rtl"
    >
      <RecallRecognitionClient studySlug={study.slug} promptIndex={Number(prompt)} />
    </StudyFrame>
  );
}
