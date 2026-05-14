import { NvltTestClient } from "@/components/nvlt-test-client";
import { StudyFrame } from "@/components/study-frame";
import { getConfiguredNvltLevels } from "@/lib/nvlt";

export default function NvltPage() {
  const levels = getConfiguredNvltLevels();

  return (
    <StudyFrame
      title="מבחן אוצר מילים באנגלית"
      dir="rtl"
    >
      <NvltTestClient levels={levels} />
    </StudyFrame>
  );
}
