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
      title="תחילת הניסוי"
      studySlug={study.slug}
      dir="rtl"
    >
      <StartPhaseClient
        studySlug={study.slug}
        passageCount={study.versions[0].learningTrials.length}
        versionCount={study.versions.length}
      />
    </StudyFrame>
  );
}
