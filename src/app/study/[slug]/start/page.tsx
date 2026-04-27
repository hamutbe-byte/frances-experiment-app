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
    <StudyFrame
      eyebrow="Reading Phase"
      title="Frances et al. (2020)"
      description="This first milestone includes only the learning phase: participants read 30 passages and answer one yes/no comprehension question after each passage."
    >
      <StartPhaseClient
        studySlug={study.slug}
        passageCount={study.versions[0].learningTrials.length}
        versionCount={study.versions.length}
      />
    </StudyFrame>
  );
}
