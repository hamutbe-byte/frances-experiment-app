import Link from "next/link";

import { listSessionBundles } from "@/lib/store";
import { getStudyOrThrow } from "@/lib/study";

export const dynamic = "force-dynamic";

export default function AdminStudiesPage() {
  const study = getStudyOrThrow("frances-2020");
  const bundles = listSessionBundles();
  const versionCounts = study.versions.map((version) => ({
    version,
    count: bundles.filter((bundle) => bundle.session.versionId === version.id).length
  }));

  return (
    <main className="page-shell admin-shell">
      <div className="page-inner stack">
        <section className="hero">
          <span className="eyebrow">Admin</span>
          <h1>Study Overview</h1>
          <p>Monitor local sessions, version balance, and available export files.</p>
        </section>

        <section className="panel admin-panel">
          <div className="admin-actions">
            <Link className="button" href="/admin/sessions">
              View sessions
            </Link>
            <Link className="button button-secondary" href="/admin/export?format=csv&type=summary">
              Summary CSV
            </Link>
            <Link className="button button-secondary" href="/admin/export?format=csv&type=responses">
              Responses CSV
            </Link>
            <Link className="button button-secondary" href="/admin/export?format=json">
              JSON export
            </Link>
          </div>

          <div className="meta-grid">
            <div className="meta-card">
              <span className="meta-label">Sessions</span>
              <span className="meta-value">{bundles.length}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Completed</span>
              <span className="meta-value">{bundles.filter((bundle) => bundle.session.status === "complete").length}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Recall Prompts</span>
              <span className="meta-value">{study.recallPrompts.length}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Matching Trials</span>
              <span className="meta-value">{study.matchingTrials.length}</span>
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Assigned Sessions</th>
                <th>Learning Trials</th>
              </tr>
            </thead>
            <tbody>
              {versionCounts.map(({ version, count }) => (
                <tr key={version.id}>
                  <td>{version.label}</td>
                  <td>{count}</td>
                  <td>{version.learningTrials.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
