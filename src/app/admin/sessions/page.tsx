import Link from "next/link";

import { listSessionBundles } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function AdminSessionsPage() {
  const bundles = listSessionBundles();

  return (
    <main className="page-shell admin-shell">
      <div className="page-inner stack">
        <section className="hero">
          <span className="eyebrow">Admin</span>
          <h1>Sessions</h1>
          <p>Inspect participant progress and response counts from the local session store.</p>
        </section>

        <section className="panel admin-panel">
          <div className="admin-actions">
            <Link className="button button-secondary" href="/admin/studies">
              Back to overview
            </Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Status</th>
                <th>Version</th>
                <th>Learning</th>
                <th>Distractor</th>
                <th>Recall</th>
                <th>Recognition</th>
                <th>Matching</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((bundle) => (
                <tr key={bundle.session.id}>
                  <td>
                    <Link href={`/admin/sessions/${bundle.session.id}`}>{bundle.session.id}</Link>
                  </td>
                  <td>{bundle.session.status}</td>
                  <td>{bundle.session.versionNumber}</td>
                  <td>{bundle.comprehension.length}</td>
                  <td>{bundle.distractor.length}</td>
                  <td>{bundle.recall.length}</td>
                  <td>{bundle.recognition.length}</td>
                  <td>{bundle.matching.length}</td>
                  <td>{bundle.session.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
