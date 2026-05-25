import { Suspense } from "react";

import { NvltTestClient } from "@/components/nvlt-test-client";
import { StudyFrame } from "@/components/study-frame";
import { getConfiguredNvltLevels } from "@/lib/nvlt";
import { getDefaultStudySlug } from "@/lib/study";

export default function NvltPage() {
  const levels = getConfiguredNvltLevels();

  return (
    <StudyFrame studySlug={getDefaultStudySlug()} screen="nvlt" dir="rtl">
      <Suspense fallback={null}>
        <NvltTestClient levels={levels} />
      </Suspense>
    </StudyFrame>
  );
}
