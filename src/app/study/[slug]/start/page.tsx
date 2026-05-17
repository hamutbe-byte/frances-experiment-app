import { StartPhaseClient } from "@/components/start-phase-client";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StartPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame studySlug={study.slug} dir="rtl">
      <StartPhaseClient studySlug={study.slug} />
    </StudyFrame>
  );
}
