import { redirect } from "next/navigation";

import { getDefaultStudySlug } from "@/lib/study";

export default function HomePage() {
  redirect(`/study/${getDefaultStudySlug()}/start`);
}
