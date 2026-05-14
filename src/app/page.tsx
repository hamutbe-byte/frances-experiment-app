import Link from "next/link";

import { getDefaultStudySlug } from "@/lib/study";

export default function HomePage() {
  const defaultStudyPath = `/study/${getDefaultStudySlug()}/start`;

  return (
    <main className="page-shell">
      <div className="page-inner stack">
        <section className="hero">
          <span className="eyebrow">Research App</span>
          <h1>Choose a flow</h1>
          <p>
            The Frances experiment stays available as before, and the NVLT Version B vocabulary test is now available as a
            separate worksheet-style route.
          </p>
        </section>

        <section className="home-grid">
          <Link href={defaultStudyPath} className="panel home-card">
            <span className="pill">Frances et al. (2020)</span>
            <h2>Contextual diversity experiment</h2>
            <p>Start or resume the Hebrew-shell reading experiment with learning, distractor, recall, and matching phases.</p>
          </Link>

          <Link href="/nvlt" className="panel home-card">
            <span className="pill">NVLT Version B</span>
            <h2>Vocabulary levels test</h2>
            <p>Open the worksheet-style vocabulary test with configurable levels and fixed question order from the source PDF.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
