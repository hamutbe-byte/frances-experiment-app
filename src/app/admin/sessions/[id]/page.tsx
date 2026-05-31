import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionBundle } from "@/lib/store";
import type { SessionBundle } from "@/lib/types";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

function formatList(items: string[]) {
  const values = items.filter(Boolean);
  return values.length > 0 ? values.join(", ") : "—";
}

function formatLanguagePercentages(items: Array<{ language: string; percentage: string }>) {
  const values = items
    .filter((item) => item.language || item.percentage)
    .map((item) => `${item.language || "—"}: ${item.percentage || "—"}`);
  return values.length > 0 ? values.join(" | ") : "—";
}

function formatCultures(items: Array<{ culture: string; identificationLevel: number | null }>) {
  const values = items
    .filter((item) => item.culture || item.identificationLevel !== null)
    .map((item) => `${item.culture || "—"} (${item.identificationLevel ?? "—"})`);
  return values.length > 0 ? values.join(" | ") : "—";
}

function formatDisabilities(questionnaire: SessionBundle["questionnaire"]) {
  if (!questionnaire) {
    return "—";
  }

  const labels = [
    questionnaire.hasVisionProblem ? "Vision problem" : null,
    questionnaire.hasHearingImpairment ? "Hearing impairment" : null,
    questionnaire.hasLanguageDisability ? "Language disability" : null,
    questionnaire.hasLearningDisability ? "Learning disability" : null
  ].filter(Boolean);

  return labels.length > 0 ? labels.join(", ") : "—";
}

export default async function AdminSessionDetailPage({ params }: Props) {
  const { id } = await params;
  const bundle = await getSessionBundle(id);
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

          {bundle.questionnaire ? (
            <section className="stack">
              <div className="meta-grid">
                <div className="meta-card">
                  <span className="meta-label">Participant</span>
                  <span className="meta-value">
                    {[bundle.questionnaire.firstName, bundle.questionnaire.lastName].filter(Boolean).join(" ") || "—"}
                  </span>
                </div>
                <div className="meta-card">
                  <span className="meta-label">Gender</span>
                  <span className="meta-value">{bundle.questionnaire.gender || "—"}</span>
                </div>
                <div className="meta-card">
                  <span className="meta-label">Education</span>
                  <span className="meta-value">{bundle.questionnaire.educationLevel || "—"}</span>
                </div>
              </div>

              <table className="admin-table">
                <tbody>
                  <tr>
                    <th>Today&apos;s date</th>
                    <td>{bundle.questionnaire.todayDate || "—"}</td>
                  </tr>
                  <tr>
                    <th>Age</th>
                    <td>{bundle.questionnaire.age ?? "—"}</td>
                  </tr>
                  <tr>
                    <th>Date of birth</th>
                    <td>{bundle.questionnaire.dateOfBirth || "—"}</td>
                  </tr>
                  <tr>
                    <th>Languages by dominance</th>
                    <td>{formatList(bundle.questionnaire.languagesByDominance)}</td>
                  </tr>
                  <tr>
                    <th>Languages by acquisition</th>
                    <td>{formatList(bundle.questionnaire.languagesByAcquisition)}</td>
                  </tr>
                  <tr>
                    <th>Current exposure</th>
                    <td>{formatLanguagePercentages(bundle.questionnaire.currentExposure)}</td>
                  </tr>
                  <tr>
                    <th>Reading preference</th>
                    <td>{formatLanguagePercentages(bundle.questionnaire.readingPreference)}</td>
                  </tr>
                  <tr>
                    <th>Speaking preference</th>
                    <td>{formatLanguagePercentages(bundle.questionnaire.speakingPreference)}</td>
                  </tr>
                  <tr>
                    <th>Cultures</th>
                    <td>{formatCultures(bundle.questionnaire.cultures)}</td>
                  </tr>
                  <tr>
                    <th>Years of education</th>
                    <td>{bundle.questionnaire.yearsOfEducation ?? "—"}</td>
                  </tr>
                  <tr>
                    <th>English course level</th>
                    <td>{bundle.questionnaire.englishCourseLevel || "—"}</td>
                  </tr>
                  <tr>
                    <th>Education other</th>
                    <td>{bundle.questionnaire.educationLevelOther || "—"}</td>
                  </tr>
                  <tr>
                    <th>Aliyah date</th>
                    <td>{bundle.questionnaire.usaImmigrationDate || "—"}</td>
                  </tr>
                  <tr>
                    <th>Other immigration</th>
                    <td>{bundle.questionnaire.otherImmigrationDetails || "—"}</td>
                  </tr>
                  <tr>
                    <th>Disabilities</th>
                    <td>{formatDisabilities(bundle.questionnaire)}</td>
                  </tr>
                  <tr>
                    <th>Disability explanation</th>
                    <td>{bundle.questionnaire.disabilityExplanation || "—"}</td>
                  </tr>
                </tbody>
              </table>

              {bundle.questionnaire.languageProfiles.length > 0 ? (
                <div className="stack">
                  {bundle.questionnaire.languageProfiles.map((profile, index) => (
                    <table key={`${profile.language || "language"}-${index}`} className="admin-table">
                      <tbody>
                        <tr>
                          <th>Language</th>
                          <td>{profile.language || "—"}</td>
                        </tr>
                        <tr>
                          <th>Language status</th>
                          <td>{profile.languageStatus || "—"}</td>
                        </tr>
                        <tr>
                          <th>Age acquired</th>
                          <td>{profile.ageBeganAcquiring ?? "—"}</td>
                        </tr>
                        <tr>
                          <th>Age fluent</th>
                          <td>{profile.ageBecameFluent ?? "—"}</td>
                        </tr>
                        <tr>
                          <th>Age started reading</th>
                          <td>{profile.ageBeganReading ?? "—"}</td>
                        </tr>
                        <tr>
                          <th>Age fluent reading</th>
                          <td>{profile.ageBecameFluentReading ?? "—"}</td>
                        </tr>
                        <tr>
                          <th>Country environment</th>
                          <td>
                            {profile.countryYears ?? "—"} years, {profile.countryMonths ?? "—"} months
                          </td>
                        </tr>
                        <tr>
                          <th>Family environment</th>
                          <td>
                            {profile.familyYears ?? "—"} years, {profile.familyMonths ?? "—"} months
                          </td>
                        </tr>
                        <tr>
                          <th>School/work environment</th>
                          <td>
                            {profile.schoolWorkYears ?? "—"} years, {profile.schoolWorkMonths ?? "—"} months
                          </td>
                        </tr>
                        <tr>
                          <th>Proficiency</th>
                          <td>
                            Speaking: {profile.speakingProficiency ?? "—"} | Understanding:{" "}
                            {profile.understandingSpokenLanguageProficiency ?? "—"} | Reading: {profile.readingProficiency ?? "—"}
                          </td>
                        </tr>
                        <tr>
                          <th>Learning factors</th>
                          <td>
                            Friends: {profile.learningByFriends ?? "—"} | Family: {profile.learningByFamily ?? "—"} | Reading:{" "}
                            {profile.learningByReading ?? "—"} | Tapes/self instruction: {profile.learningByLanguageTapesSelfInstruction ?? "—"} |
                            TV: {profile.learningByWatchingTv ?? "—"} | Radio: {profile.learningByListeningToRadio ?? "—"}
                          </td>
                        </tr>
                        <tr>
                          <th>Current exposure</th>
                          <td>
                            Friends: {profile.exposureToFriends ?? "—"} | Family: {profile.exposureToFamily ?? "—"} | TV:{" "}
                            {profile.exposureToWatchingTv ?? "—"} | Radio/music: {profile.exposureToRadioMusic ?? "—"} | Reading:{" "}
                            {profile.exposureToReading ?? "—"} | Language lab/self instruction:{" "}
                            {profile.exposureToLanguageLabSelfInstruction ?? "—"}
                          </td>
                        </tr>
                        <tr>
                          <th>Foreign accent</th>
                          <td>{profile.foreignAccent ?? "—"}</td>
                        </tr>
                        <tr>
                          <th>Identified as non-native</th>
                          <td>{profile.nonNativeIdentificationByAccent ?? "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

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
