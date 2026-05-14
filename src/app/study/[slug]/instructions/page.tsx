import { InstructionsClient } from "@/components/instructions-client";
import { StudyFrame } from "@/components/study-frame";
import { getStudyOrThrow } from "@/lib/study";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function InstructionsPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudyOrThrow(slug);

  return (
    <StudyFrame
      title="הוראות"
      description="קראו כל קטע באנגלית וענו על שאלת ההבנה שאחריו. לאחר שלב הקריאה תמשיכו למשימות זיכרון והתאמה, שגם התוכן שלהן יופיע באנגלית."
      studySlug={study.slug}
      dir="rtl"
    >
      <InstructionsClient studySlug={study.slug} />
    </StudyFrame>
  );
}
