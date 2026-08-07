import { AdminContentLauncher } from "@/components/admin-content-launcher";
import { editableFieldDefinitions, editableScreens } from "@/lib/content";
import { getDefaultStudySlug } from "@/lib/study";

export const dynamic = "force-dynamic";

const screenLabels: Record<(typeof editableScreens)[number], string> = {
  consent: "טופס הסכמה",
  questionnaire: "שאלון פתיחה",
  nvlt: "NVLT",
  learning: "למידה",
  distractor: "הסחה",
  recall: "זכירה וזיהוי",
  matching: "התאמה"
};

export default function AdminContentPage() {
  const studySlug = getDefaultStudySlug();
  const questionnairePath = `/study/${studySlug}/start`;
  const nvltPath = "/nvlt";

  return (
    <main className="page-shell admin-shell">
      <div className="page-inner stack">
        <section className="hero">
          <span className="eyebrow">Admin</span>
          <h1>Content Editor</h1>
          <p>Enable inline editing, update live interface text, and restore default wording when needed.</p>
        </section>

        <section className="panel admin-panel">
          <AdminContentLauncher questionnairePath={questionnairePath} nvltPath={nvltPath} />

          <table className="admin-table">
            <thead>
              <tr>
                <th>Screen</th>
                <th>Editable Fields</th>
              </tr>
            </thead>
            <tbody>
              {editableScreens.map((screen) => (
                <tr key={screen}>
                  <td>{screenLabels[screen]}</td>
                  <td>{editableFieldDefinitions.filter((field) => field.screen === screen).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
