import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionBundle } from "@/lib/store";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminSessionDetailPage({ params }: Props) {
  const { id } = await params;
  const bundle = getSessionBundle(id);
  if (!bundle) {
    notFound();
  }

  const timeline = [
    ...bundle.comprehension.map((entry) => ({
      phase: "comprehension",
      item: entry.trialIndex,
      value: entry.answer,
      correct: entry.correct,
      rt: entry.responseTimeMs,
      timestamp: entry.answeredAt
    })),
    ...bundle.distractor.map((entry) => ({
      phase: "distractor",
      item: entry.trialIndex,
      value: `${entry.direction} ${entry.responseSequence.join("-")} / ${entry.shownSequence.join("-")}`,
      correct: entry.correct,
      rt: entry.responseTimeMs,
      timestamp: entry.answeredAt
    })),
    ...bundle.recall.map((entry) => ({
      phase: "recall",
      item: entry.promptIndex,
      value: entry.text,
      correct: "",
      rt: entry.totalResponseTimeMs,
      timestamp: entry.submittedAt
    })),
    ...bundle.recognition.map((entry) => ({
      phase: "recognition",
      item: entry.promptIndex,
      value: entry.selectedOptionText,
      correct: entry.correct,
      rt: entry.responseTimeMs,
      timestamp: entry.answeredAt
    })),
    ...bundle.matching.map((entry) => ({
      phase: "matching",
      item: entry.trialIndex,
      value: `${entry.answer} (${entry.pictureId}, ${entry.condition})`,
      correct: entry.correct,
      rt: entry.responseTimeMs,
      timestamp: entry.answeredAt
    }))
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  return (
    <main className="page-shell admin-shell">
      <div className="page-inner stack">
        <section className="hero">
          <span className="eyebrow">Admin</span>
          <h1>Session Detail</h1>
          <p>{bundle.session.id}</p>
        </section>

        <section className="panel admin-panel">
          <div className="admin-actions">
            <Link className="button button-secondary" href="/admin/sessions">
              Back to sessions
            </Link>
          </div>

          <div className="meta-grid">
            <div className="meta-card">
              <span className="meta-label">Status</span>
              <span className="meta-value">{bundle.session.status}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Version</span>
              <span className="meta-value">{bundle.session.versionNumber}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Completion Code</span>
              <span className="meta-value">{bundle.session.completionCode}</span>
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Item</th>
                <th>Value</th>
                <th>Correct</th>
                <th>RT</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((entry, index) => (
                <tr key={`${entry.phase}-${entry.item}-${index}`}>
                  <td>{entry.phase}</td>
                  <td>{entry.item}</td>
                  <td>{entry.value}</td>
                  <td>{String(entry.correct)}</td>
                  <td>{entry.rt}</td>
                  <td>{entry.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
