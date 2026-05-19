import { Suspense } from "react";

import { NvltTestClient } from "@/components/nvlt-test-client";
import { StudyFrame } from "@/components/study-frame";
import { getResolvedContentSnapshot } from "@/lib/content-server";
import { getConfiguredNvltLevels } from "@/lib/nvlt";
import { getDefaultStudySlug } from "@/lib/study";

export default function NvltPage() {
  const levels = getConfiguredNvltLevels();
  const content = getResolvedContentSnapshot();
  const instructionText = content.instructionText as typeof import("@/content/instruction-text").instructionText;

  return (
    <StudyFrame
      title={instructionText.nvlt.pageTitle}
      description={instructionText.nvlt.pageSubtitle}
      studySlug={getDefaultStudySlug()}
      screen="nvlt"
      dir="rtl"
    >
      <Suspense fallback={null}>
        <NvltTestClient levels={levels} />
      </Suspense>
    </StudyFrame>
  );
}
