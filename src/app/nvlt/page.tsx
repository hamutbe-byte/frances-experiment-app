import { Suspense } from "react";

import { NvltTestClient } from "@/components/nvlt-test-client";
import { instructionText } from "@/content/instruction-text";
import { StudyFrame } from "@/components/study-frame";
import { getConfiguredNvltLevels } from "@/lib/nvlt";
import { getDefaultStudySlug } from "@/lib/study";

export default function NvltPage() {
  const levels = getConfiguredNvltLevels();

  return (
    <StudyFrame
      title={instructionText.nvlt.pageTitle}
      description={instructionText.nvlt.pageSubtitle}
      studySlug={getDefaultStudySlug()}
      dir="rtl"
    >
      <Suspense fallback={null}>
        <NvltTestClient levels={levels} />
      </Suspense>
    </StudyFrame>
  );
}
