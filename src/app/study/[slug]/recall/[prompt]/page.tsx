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
  const appText = content.appText as typeof import("@/content/app-text").appText;

  return (
    <StudyFrame title={appText.study.pages.recallTitle} studySlug={study.slug} screen="recall" dir="rtl">
      <RecallRecognitionClient studySlug={study.slug} promptIndex={Number(prompt)} />
    </StudyFrame>
  );
}
