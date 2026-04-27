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
      eyebrow="Memory Questions"
      title="Complete the blanks"
      description="Type the pseudoword you remember, then choose it from the options shown next."
      studySlug={study.slug}
    >
      <RecallRecognitionClient studySlug={study.slug} promptIndex={Number(prompt)} />
    </StudyFrame>
  );
}
