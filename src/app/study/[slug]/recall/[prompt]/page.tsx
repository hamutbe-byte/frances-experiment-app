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
      eyebrow="שלב הזיכרון"
      title="השלימו את החסר"
      description="השאלה עצמה מוצגת באנגלית. תחילה הקלידו את מילת הפסאודו שאתם זוכרים, ואז בחרו אותה מבין האפשרויות."
      studySlug={study.slug}
      dir="rtl"
    >
      <RecallRecognitionClient studySlug={study.slug} promptIndex={Number(prompt)} />
    </StudyFrame>
  );
}
