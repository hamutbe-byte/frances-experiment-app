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

  return (
    <StudyFrame studySlug={study.slug} screen="recall" dir="rtl">
      <RecallRecognitionClient
        studySlug={study.slug}
        promptIndex={Number(prompt)}
        progressLabel={formatContent("שאלה {current} מתוך {total}", {
          current: Number(prompt),
          total: study.recallPrompts.length
        })}
      />
    </StudyFrame>
  );
}
