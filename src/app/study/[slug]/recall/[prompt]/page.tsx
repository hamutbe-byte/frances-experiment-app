import { RecallRecognitionClient } from "@/components/recall-recognition-client";
import { StudyFrame } from "@/components/study-frame";
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

  return (
    <StudyFrame
      title="שלב הזיכרון"
      studySlug={study.slug}
      dir="rtl"
    >
      <RecallRecognitionClient studySlug={study.slug} promptIndex={Number(prompt)} />
    </StudyFrame>
  );
}
