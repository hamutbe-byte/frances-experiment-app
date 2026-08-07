import { ResearchConsentGate } from "@/components/research-consent-gate";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ConsentPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame studySlug={study.slug} screen="consent" dir="rtl">
      <ResearchConsentGate studySlug={study.slug} alwaysShow />
    </StudyFrame>
  );
}
