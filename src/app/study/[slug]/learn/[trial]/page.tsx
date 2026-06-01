import { LearningTrialClient } from "@/components/learning-trial-client";
import { EditableContentText } from "@/components/editable-content-text";
import { StudyFrame } from "@/components/study-frame";
import { formatContent } from "@/lib/content";
import { getStudyOrThrow } from "@/lib/study";
import { getResolvedContentSnapshot } from "@/lib/content-server";

interface Props {
  params: Promise<{
    slug: string;
    trial: string;
  }>;
}

export default async function LearningTrialPage({ params }: Props) {
  const { slug, trial } = await params;
  const study = getStudyOrThrow(slug);
  const content = getResolvedContentSnapshot();
  const appText = content.appText as typeof import("@/content/app-text").appText;
  const learningTrialCount = study.versions[0]?.learningTrials.length ?? 0;

  return (
    <StudyFrame
      descriptionNode={
        <div className="study-hero-stack">
          <EditableContentText contentKey="appText.study.learning.subtitle" tag="p" className="study-hero-description">
            {appText.study.learning.subtitle}
          </EditableContentText>
        </div>
      }
      studySlug={study.slug}
      screen="learning"
      dir="rtl"
    >
      <LearningTrialClient
        studySlug={study.slug}
        trialIndex={Number(trial)}
        progressLabel={formatContent(appText.study.learning.progressLabel, {
          current: Number(trial),
          total: learningTrialCount
        })}
      />
    </StudyFrame>
  );
}
