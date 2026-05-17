import { redirect } from "next/navigation";

import { getDefaultStudySlug } from "@/lib/study";

export default function HomePage() {
  const studySlug = getDefaultStudySlug();
  const fullFlowPath = `/study/${studySlug}/start?next=${encodeURIComponent(
    `/nvlt?next=${encodeURIComponent(`/study/${studySlug}/instructions`)}`
  )}`;

  redirect(fullFlowPath);
}
