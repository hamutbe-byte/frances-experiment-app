import { LearningTrialClient } from "@/components/learning-trial-client";
import { EditableContentText } from "@/components/editable-content-text";
import { StudyFrame } from "@/components/study-frame";
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

  return (
    <StudyFrame
      descriptionNode={
        <EditableContentText contentKey="appText.study.learning.subtitle" tag="p" className="study-hero-description">
          {appText.study.learning.subtitle}
        </EditableContentText>
      }
      studySlug={study.slug}
      screen="learning"
      dir="rtl"
    >
      <LearningTrialClient studySlug={study.slug} trialIndex={Number(trial)} />
    </StudyFrame>
  );
}
