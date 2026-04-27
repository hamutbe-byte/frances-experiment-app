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
      title="Experiment complete"
      description="Thank you for completing the available experiment phases."
      studySlug={study.slug}
    >
      <CompletePhaseClient studySlug={study.slug} />
    </StudyFrame>
  );
}
