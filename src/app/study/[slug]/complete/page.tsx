import { CompletePhaseClient } from "@/components/complete-phase-client";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CompletePage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame
      eyebrow="Complete"
      title="Reading phase finished"
      description="You have reached the end of the training phase. Recall and matching tasks will be added in the next implementation pass."
    >
      <CompletePhaseClient studySlug={study.slug} />
    </StudyFrame>
  );
}
