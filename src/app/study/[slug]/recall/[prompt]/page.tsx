import { BilingualInstructionText } from "@/components/bilingual-instruction-text";
import { EditableContentText } from "@/components/editable-content-text";
import { RecallRecognitionClient } from "@/components/recall-recognition-client";
import { StudyFrame } from "@/components/study-frame";
import { formatContent } from "@/lib/content";
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
  const appText = content.appText as typeof import("@/content/app-text").appText;
  const instructionText = content.instructionText as typeof import("@/content/instruction-text").instructionText;

  return (
    <StudyFrame
      descriptionNode={
        <div className="study-hero-stack">
          <EditableContentText contentKey="appText.study.recall.progressLabel" tag="p" className="study-progress">
            {formatContent(appText.study.recall.progressLabel, {
              stepLabel: appText.study.pages.recallTitle,
              current: Number(prompt),
              total: study.recallPrompts.length
            })}
          </EditableContentText>
          <BilingualInstructionText
            labelContentKey="instructionText.study.recall.recallInputLabel"
            englishContentKey="instructionText.study.recall.recallInputLabelEnglish"
            label={instructionText.study.recall.recallInputLabel}
            english={instructionText.study.recall.recallInputLabelEnglish}
            labelClassName="recall-page-subtitle-label"
            englishClassName="instruction-english recall-page-subtitle-english"
          />
        </div>
      }
      studySlug={study.slug}
      screen="recall"
      dir="rtl"
    >
      <RecallRecognitionClient studySlug={study.slug} promptIndex={Number(prompt)} />
    </StudyFrame>
  );
}
