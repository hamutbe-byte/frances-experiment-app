"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { questionnaireText } from "@/content/questionnaire-text";
import { getDeviceSnapshot } from "@/lib/browser";
import { createSessionRequest, saveCurrentSessionId } from "@/lib/session-client";
import type { ParticipantQuestionnaireInput } from "@/lib/types";

interface StartPhaseClientProps {
  studySlug: string;
}

interface PercentageEntryFormState {
  language: string;
  percentage: string;
}

interface CultureEntryFormState {
  culture: string;
  identificationLevel: string;
}

interface LanguageProfileFormState {
  language: string;
  languageStatus: string;
  ageBeganAcquiring: string;
  ageBecameFluent: string;
  ageBeganReading: string;
  ageBecameFluentReading: string;
  countryYears: string;
  countryMonths: string;
  familyYears: string;
  familyMonths: string;
  schoolWorkYears: string;
  schoolWorkMonths: string;
  speakingProficiency: string;
  understandingSpokenLanguageProficiency: string;
  readingProficiency: string;
  learningByFriends: string;
  learningByFamily: string;
  learningByReading: string;
  learningByLanguageTapesSelfInstruction: string;
  learningByWatchingTv: string;
  learningByListeningToRadio: string;
  exposureToFriends: string;
  exposureToFamily: string;
  exposureToWatchingTv: string;
  exposureToRadioMusic: string;
  exposureToReading: string;
  exposureToLanguageLabSelfInstruction: string;
  foreignAccent: string;
  nonNativeIdentificationByAccent: string;
}

interface QuestionnaireFormState {
  lastName: string;
  firstName: string;
  todayDate: string;
  age: string;
  dateOfBirth: string;
  gender: string;
  languagesByDominance: string[];
  languagesByAcquisition: string[];
  currentExposure: PercentageEntryFormState[];
  readingPreference: PercentageEntryFormState[];
  speakingPreference: PercentageEntryFormState[];
  cultures: CultureEntryFormState[];
  yearsOfEducation: string;
  educationLevel: string;
  educationLevelOther: string;
  usaImmigrationDate: string;
  otherImmigrationDetails: string;
  hasVisionProblem: boolean;
  hasHearingImpairment: boolean;
  hasLanguageDisability: boolean;
  hasLearningDisability: boolean;
  disabilityExplanation: string;
  languageProfiles: LanguageProfileFormState[];
}

type PercentageField = "currentExposure" | "readingPreference" | "speakingPreference";

const rankedSlotCount = questionnaireText.rankingSlots.length;
const languageProfileCount = 2;
const questionnaireStepCount = questionnaireText.steps.length;

function makeRankedLanguageList() {
  return Array.from({ length: rankedSlotCount }, () => "");
}

function makePercentageEntries(): PercentageEntryFormState[] {
  return Array.from({ length: rankedSlotCount }, () => ({
    language: "",
    percentage: ""
  }));
}

function makeCultureEntries(): CultureEntryFormState[] {
  return Array.from({ length: rankedSlotCount }, () => ({
    culture: "",
    identificationLevel: ""
  }));
}

function makeEmptyLanguageProfile(): LanguageProfileFormState {
  return {
    language: "",
    languageStatus: "",
    ageBeganAcquiring: "",
    ageBecameFluent: "",
    ageBeganReading: "",
    ageBecameFluentReading: "",
    countryYears: "",
    countryMonths: "",
    familyYears: "",
    familyMonths: "",
    schoolWorkYears: "",
    schoolWorkMonths: "",
    speakingProficiency: "",
    understandingSpokenLanguageProficiency: "",
    readingProficiency: "",
    learningByFriends: "",
    learningByFamily: "",
    learningByReading: "",
    learningByLanguageTapesSelfInstruction: "",
    learningByWatchingTv: "",
    learningByListeningToRadio: "",
    exposureToFriends: "",
    exposureToFamily: "",
    exposureToWatchingTv: "",
    exposureToRadioMusic: "",
    exposureToReading: "",
    exposureToLanguageLabSelfInstruction: "",
    foreignAccent: "",
    nonNativeIdentificationByAccent: ""
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatValidationMessage(template: string, label: string) {
  return template.replace("{label}", label);
}

function LanguageSelect(props: {
  value: string;
  onChange: (value: string) => void;
  blankLabel?: string;
}) {
  const { value, onChange, blankLabel = "בחרו שפה" } = props;

  return (
    <select className="select-input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{blankLabel}</option>
      {questionnaireText.languageOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ScaleSelect(props: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  blankLabel?: string;
}) {
  const { value, onChange, options, blankLabel = "בחרו" } = props;

  return (
    <select className="select-input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{blankLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function PercentageSelect(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { value, onChange } = props;

  return (
    <select className="select-input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">בחרו אחוז</option>
      {questionnaireText.percentageOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function StartPhaseClient({ studySlug }: StartPhaseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionnaireFormState>({
    lastName: "",
    firstName: "",
    todayDate: getTodayDateValue(),
    age: "",
    dateOfBirth: "",
    gender: "",
    languagesByDominance: makeRankedLanguageList(),
    languagesByAcquisition: makeRankedLanguageList(),
    currentExposure: makePercentageEntries(),
    readingPreference: makePercentageEntries(),
    speakingPreference: makePercentageEntries(),
    cultures: makeCultureEntries(),
    yearsOfEducation: "",
    educationLevel: "",
    educationLevelOther: "",
    usaImmigrationDate: "",
    otherImmigrationDetails: "",
    hasVisionProblem: false,
    hasHearingImpairment: false,
    hasLanguageDisability: false,
    hasLearningDisability: false,
    disabilityExplanation: "",
    languageProfiles: Array.from({ length: languageProfileCount }, () => makeEmptyLanguageProfile())
  });

  function updateField<Key extends keyof QuestionnaireFormState>(field: Key, value: QuestionnaireFormState[Key]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateRankedLanguages(field: "languagesByDominance" | "languagesByAcquisition", index: number, value: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((entry, entryIndex) => (entryIndex === index ? value : entry))
    }));
  }

  function updatePercentageEntries(field: PercentageField, index: number, key: keyof PercentageEntryFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [key]: value
            }
          : entry
      )
    }));
  }

  function updateCultureEntry(index: number, key: keyof CultureEntryFormState, value: string) {
    setForm((current) => ({
      ...current,
      cultures: current.cultures.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [key]: value
            }
          : entry
      )
    }));
  }

  function updateLanguageProfile(index: number, field: keyof LanguageProfileFormState, value: string) {
    setForm((current) => ({
      ...current,
      languageProfiles: current.languageProfiles.map((profile, profileIndex) =>
        profileIndex === index
          ? {
              ...profile,
              [field]: value
            }
          : profile
      )
    }));
  }

  function validatePercentageGroup(entries: PercentageEntryFormState[], label: string) {
    let total = 0;

    for (const entry of entries) {
      const hasLanguage = Boolean(entry.language);
      const hasPercentage = entry.percentage !== "";

      if (hasPercentage && !hasLanguage) {
        return formatValidationMessage(questionnaireText.validation.percentageLanguageMissing, label);
      }

      if (hasLanguage && !hasPercentage) {
        return formatValidationMessage(questionnaireText.validation.percentageValueMissing, label);
      }

      if (hasLanguage && hasPercentage) {
        total += Number(entry.percentage);
      }
    }

    if (total !== 100) {
      return formatValidationMessage(questionnaireText.validation.percentageTotal, label);
    }

    return null;
  }

  function validateForm() {
    const groups: Array<[PercentageField, string]> = [
      ["currentExposure", "חשיפה נוכחית"],
      ["readingPreference", "העדפת קריאה"],
      ["speakingPreference", "העדפת דיבור"]
    ];

    for (const [field, label] of groups) {
      const validationError = validatePercentageGroup(form[field], label);
      if (validationError) {
        return validationError;
      }
    }

    return null;
  }

  function validateQuestionnaireStep(stepIndex: number) {
    if (stepIndex !== 0) {
      return null;
    }

    return validateForm();
  }

  function validateAllSteps() {
    for (let stepIndex = 0; stepIndex < questionnaireStepCount; stepIndex += 1) {
      const validationError = validateQuestionnaireStep(stepIndex);
      if (validationError) {
        return { stepIndex, validationError };
      }
    }

    return null;
  }

  function goToStep(stepIndex: number) {
    setError(null);
    setCurrentStep(Math.max(0, Math.min(stepIndex, questionnaireStepCount - 1)));
  }

  function goToNextStep() {
    const validationError = validateQuestionnaireStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setCurrentStep((value) => Math.min(value + 1, questionnaireStepCount - 1));
  }

  function goToPreviousStep() {
    setError(null);
    setCurrentStep((value) => Math.max(value - 1, 0));
  }

  function buildQuestionnairePayload(): ParticipantQuestionnaireInput {
    return {
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      todayDate: form.todayDate.trim(),
      age: parseOptionalNumber(form.age),
      dateOfBirth: form.dateOfBirth.trim(),
      gender: form.gender,
      languagesByDominance: form.languagesByDominance.map((entry) => entry.trim()),
      languagesByAcquisition: form.languagesByAcquisition.map((entry) => entry.trim()),
      currentExposure: form.currentExposure.map((entry) => ({
        language: entry.language.trim(),
        percentage: entry.percentage.trim()
      })),
      readingPreference: form.readingPreference.map((entry) => ({
        language: entry.language.trim(),
        percentage: entry.percentage.trim()
      })),
      speakingPreference: form.speakingPreference.map((entry) => ({
        language: entry.language.trim(),
        percentage: entry.percentage.trim()
      })),
      cultures: form.cultures.map((entry) => ({
        culture: entry.culture.trim(),
        identificationLevel: parseOptionalNumber(entry.identificationLevel)
      })),
      yearsOfEducation: parseOptionalNumber(form.yearsOfEducation),
      educationLevel: form.educationLevel,
      educationLevelOther: form.educationLevelOther.trim(),
      usaImmigrationDate: form.usaImmigrationDate.trim(),
      otherImmigrationDetails: form.otherImmigrationDetails.trim(),
      hasVisionProblem: form.hasVisionProblem,
      hasHearingImpairment: form.hasHearingImpairment,
      hasLanguageDisability: form.hasLanguageDisability,
      hasLearningDisability: form.hasLearningDisability,
      disabilityExplanation: form.disabilityExplanation.trim(),
      languageProfiles: form.languageProfiles.map((profile) => ({
        language: profile.language.trim(),
        languageStatus: profile.languageStatus,
        ageBeganAcquiring: parseOptionalNumber(profile.ageBeganAcquiring),
        ageBecameFluent: parseOptionalNumber(profile.ageBecameFluent),
        ageBeganReading: parseOptionalNumber(profile.ageBeganReading),
        ageBecameFluentReading: parseOptionalNumber(profile.ageBecameFluentReading),
        countryYears: parseOptionalNumber(profile.countryYears),
        countryMonths: parseOptionalNumber(profile.countryMonths),
        familyYears: parseOptionalNumber(profile.familyYears),
        familyMonths: parseOptionalNumber(profile.familyMonths),
        schoolWorkYears: parseOptionalNumber(profile.schoolWorkYears),
        schoolWorkMonths: parseOptionalNumber(profile.schoolWorkMonths),
        speakingProficiency: parseOptionalNumber(profile.speakingProficiency),
        understandingSpokenLanguageProficiency: parseOptionalNumber(profile.understandingSpokenLanguageProficiency),
        readingProficiency: parseOptionalNumber(profile.readingProficiency),
        learningByFriends: parseOptionalNumber(profile.learningByFriends),
        learningByFamily: parseOptionalNumber(profile.learningByFamily),
        learningByReading: parseOptionalNumber(profile.learningByReading),
        learningByLanguageTapesSelfInstruction: parseOptionalNumber(profile.learningByLanguageTapesSelfInstruction),
        learningByWatchingTv: parseOptionalNumber(profile.learningByWatchingTv),
        learningByListeningToRadio: parseOptionalNumber(profile.learningByListeningToRadio),
        exposureToFriends: parseOptionalNumber(profile.exposureToFriends),
        exposureToFamily: parseOptionalNumber(profile.exposureToFamily),
        exposureToWatchingTv: parseOptionalNumber(profile.exposureToWatchingTv),
        exposureToRadioMusic: parseOptionalNumber(profile.exposureToRadioMusic),
        exposureToReading: parseOptionalNumber(profile.exposureToReading),
        exposureToLanguageLabSelfInstruction: parseOptionalNumber(profile.exposureToLanguageLabSelfInstruction),
        foreignAccent: parseOptionalNumber(profile.foreignAccent),
        nonNativeIdentificationByAccent: parseOptionalNumber(profile.nonNativeIdentificationByAccent)
      }))
    };
  }

  async function startStudy() {
    const validationResult = validateAllSteps();
    if (validationResult) {
      setCurrentStep(validationResult.stepIndex);
      setError(validationResult.validationError);
      return;
    }

    try {
      setIsPending(true);
      setError(null);
      const result = await createSessionRequest(studySlug, getDeviceSnapshot(), buildQuestionnairePayload());
      saveCurrentSessionId(studySlug, result.session.id);
      const nextPath = searchParams.get("next") ?? result.nextPath;
      startTransition(() => {
        router.push(nextPath);
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : questionnaireText.validation.generic);
      setIsPending(false);
    }
  }

  const currentStepMeta = questionnaireText.steps[currentStep];
  const isLastStep = currentStep === questionnaireStepCount - 1;

  return (
    <section className="panel stack questionnaire-panel">
      <div className="questionnaire-tabs" role="tablist" aria-label="חלקי השאלון">
        {questionnaireText.steps.map((step, index) => (
          <button
            key={step.tabLabel}
            type="button"
            role="tab"
            aria-selected={currentStep === index}
            className={`questionnaire-tab${currentStep === index ? " is-active" : ""}`}
            onClick={() => goToStep(index)}
          >
            <span>{step.tabLabel}</span>
            <strong>{step.title}</strong>
          </button>
        ))}
      </div>

      <section className="questionnaire-step-heading">
        <p>{currentStepMeta.tabLabel}</p>
        <h2>{currentStepMeta.title}</h2>
      </section>

      {currentStep === 0 ? (
        <>
      <section className="form-section">
        <div className="form-grid form-grid-three">
          <label className="form-field">
            <span>{questionnaireText.participant.lastName}</span>
            <input className="text-input" type="text" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
          </label>

          <label className="form-field">
            <span>{questionnaireText.participant.firstName}</span>
            <input className="text-input" type="text" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
          </label>

              <label className="form-field">
                <span>{questionnaireText.participant.age}</span>
                <input className="text-input" type="number" min="0" inputMode="numeric" value={form.age} onChange={(event) => updateField("age", event.target.value)} />
              </label>

          <label className="form-field">
            <span>{questionnaireText.participant.dateOfBirth}</span>
            <input className="text-input" type="date" value={form.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} />
          </label>

          <div className="form-field">
            <span>{questionnaireText.participant.gender}</span>
            <div className="questionnaire-choice-grid">
              {questionnaireText.participant.genderOptions.map((option) => (
                <label key={option.value} className="questionnaire-choice">
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={form.gender === option.value}
                    onChange={(event) => updateField("gender", event.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2>{questionnaireText.prompts.dominance}</h2>
        <div className="questionnaire-slot-grid">
          {questionnaireText.rankingSlots.map((slotLabel, index) => (
            <label key={`dominance-${slotLabel}`} className="form-field">
              <span>{slotLabel}</span>
              <LanguageSelect value={form.languagesByDominance[index]} onChange={(value) => updateRankedLanguages("languagesByDominance", index, value)} />
            </label>
          ))}
        </div>
      </section>

      <section className="form-section">
        <h2>{questionnaireText.prompts.acquisition}</h2>
        <div className="questionnaire-slot-grid">
          {questionnaireText.rankingSlots.map((slotLabel, index) => (
            <label key={`acquisition-${slotLabel}`} className="form-field">
              <span>{slotLabel}</span>
              <LanguageSelect value={form.languagesByAcquisition[index]} onChange={(value) => updateRankedLanguages("languagesByAcquisition", index, value)} />
            </label>
          ))}
        </div>
      </section>

      {(
        [
          ["currentExposure", questionnaireText.prompts.currentExposure],
          ["readingPreference", questionnaireText.prompts.readingPreference],
          ["speakingPreference", questionnaireText.prompts.speakingPreference]
        ] as const
      ).map(([field, prompt]) => (
        <section key={field} className="form-section">
          <h2>{prompt}</h2>
          <p className="questionnaire-note">{questionnaireText.prompts.percentagesHint}</p>
          <div className="questionnaire-table-wrap">
            <table className="questionnaire-matrix-table">
              <tbody>
                <tr>
                  <th>{questionnaireText.tableLabels.listLanguageHere}</th>
                  {form[field].map((entry, index) => (
                    <td key={`${field}-language-${index}`}>
                      <LanguageSelect value={entry.language} onChange={(value) => updatePercentageEntries(field, index, "language", value)} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>{questionnaireText.tableLabels.listPercentageHere}</th>
                  {form[field].map((entry, index) => (
                    <td key={`${field}-percentage-${index}`}>
                      <PercentageSelect value={entry.percentage} onChange={(value) => updatePercentageEntries(field, index, "percentage", value)} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="form-section">
        <h2>{questionnaireText.prompts.cultures}</h2>
        <div className="questionnaire-table-wrap">
          <table className="questionnaire-matrix-table">
            <tbody>
              <tr>
                <th>{questionnaireText.tableLabels.listCulturesHere}</th>
                {form.cultures.map((entry, index) => (
                  <td key={`culture-name-${index}`}>
                    <input
                      className="text-input"
                      type="text"
                      value={entry.culture}
                      onChange={(event) => updateCultureEntry(index, "culture", event.target.value)}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <th>{questionnaireText.tableLabels.identificationLevel}</th>
                {form.cultures.map((entry, index) => (
                  <td key={`culture-identification-${index}`}>
                    <ScaleSelect
                      value={entry.identificationLevel}
                      onChange={(value) => updateCultureEntry(index, "identificationLevel", value)}
                      options={questionnaireText.scales.identification}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

        </>
      ) : null}

      {currentStep === 1 ? (
        <>
      <section className="form-section">
        <label className="form-field">
          <span>{questionnaireText.prompts.yearsOfEducation}</span>
          <input
            className="text-input"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.yearsOfEducation}
            onChange={(event) => updateField("yearsOfEducation", event.target.value)}
          />
        </label>

        <div className="form-field">
          <span>{questionnaireText.prompts.highestEducation}</span>
          <div className="questionnaire-choice-grid">
            {questionnaireText.educationOptions.map((option) => (
              <label key={option.value} className="questionnaire-choice">
                <input
                  type="radio"
                  name="education-level"
                  value={option.value}
                  checked={form.educationLevel === option.value}
                  onChange={(event) => updateField("educationLevel", event.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {form.educationLevel === "other" ? (
          <label className="form-field">
            <span>אחר</span>
            <input
              className="text-input"
              type="text"
              value={form.educationLevelOther}
              onChange={(event) => updateField("educationLevelOther", event.target.value)}
            />
          </label>
        ) : null}
      </section>

      <section className="form-section">
        <label className="form-field">
          <span>{questionnaireText.prompts.usaImmigrationDate}</span>
          <input
            className="text-input"
            type="date"
            value={form.usaImmigrationDate}
            onChange={(event) => updateField("usaImmigrationDate", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>{questionnaireText.prompts.otherImmigrationDetails}</span>
          <textarea
            className="textarea-input"
            rows={3}
            value={form.otherImmigrationDetails}
            onChange={(event) => updateField("otherImmigrationDetails", event.target.value)}
          />
        </label>
      </section>

      <section className="form-section">
        <h2>{questionnaireText.prompts.difficulties}</h2>
        <div className="questionnaire-choice-grid">
          {questionnaireText.disabilityOptions.map((option) => (
            <label key={option.key} className="questionnaire-choice">
              <input
                type="checkbox"
                checked={form[option.key]}
                onChange={(event) => updateField(option.key, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <label className="form-field">
          <span>פירוט</span>
          <textarea
            className="textarea-input"
            rows={3}
            value={form.disabilityExplanation}
            onChange={(event) => updateField("disabilityExplanation", event.target.value)}
          />
        </label>
      </section>

        </>
      ) : null}

      {currentStep === 2
        ? form.languageProfiles.map((profile, index) => {
        const languageName = profile.language || "שפה זו";
        const profileHeading = questionnaireText.languageSection.profileHeading.replace("{number}", String(index + 1));
        const exposurePrompt = questionnaireText.languageSection.exposurePrompt.replace("{language}", languageName);
        const foreignAccentPrompt = questionnaireText.languageSection.foreignAccent.replace("{language}", languageName);
        const nonNativeIdentificationPrompt = questionnaireText.languageSection.nonNativeIdentification.replace("{language}", languageName);

        return (
          <section key={`language-profile-${index}`} className="form-section">
            <div className="questionnaire-language-header">
              <h2>{profileHeading}</h2>
              <p>{questionnaireText.languageSection.profileIntro}</p>
            </div>

            <div className="form-grid form-grid-two">
              <label className="form-field">
                <span>{questionnaireText.languageSection.heading}</span>
                <LanguageSelect value={profile.language} onChange={(value) => updateLanguageProfile(index, "language", value)} />
              </label>

              <label className="form-field">
                <span>{questionnaireText.languageSection.statusLabel}</span>
                <ScaleSelect
                  value={profile.languageStatus}
                  onChange={(value) => updateLanguageProfile(index, "languageStatus", value)}
                  options={questionnaireText.scales.languageStatus}
                />
              </label>
            </div>

            <p className="questionnaire-note">
              {questionnaireText.languageSection.knowledgePrefix}
              {languageName}.
            </p>

            <div className="form-field">
              <span>{questionnaireText.languageSection.ageWhenYou}</span>
              <div className="form-grid form-grid-two">
                <label className="form-field">
                  <span>{questionnaireText.languageSection.ageLabels.beganAcquiring}</span>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.ageBeganAcquiring}
                    onChange={(event) => updateLanguageProfile(index, "ageBeganAcquiring", event.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.ageLabels.becameFluent}</span>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.ageBecameFluent}
                    onChange={(event) => updateLanguageProfile(index, "ageBecameFluent", event.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.ageLabels.beganReading}</span>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.ageBeganReading}
                    onChange={(event) => updateLanguageProfile(index, "ageBeganReading", event.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.ageLabels.becameFluentReading}</span>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.ageBecameFluentReading}
                    onChange={(event) => updateLanguageProfile(index, "ageBecameFluentReading", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="form-field">
              <span>{questionnaireText.languageSection.environmentPrompt}</span>
              <div className="questionnaire-table-grid questionnaire-environment-grid">
                <div className="questionnaire-table-cell questionnaire-table-header" />
                <div className="questionnaire-table-cell questionnaire-table-header">{questionnaireText.languageSection.environmentColumns.years}</div>
                <div className="questionnaire-table-cell questionnaire-table-header">{questionnaireText.languageSection.environmentColumns.months}</div>

                <div className="questionnaire-table-cell">{`${questionnaireText.languageSection.environmentRows.country} ${languageName}`}</div>
                <div className="questionnaire-table-cell">
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.countryYears}
                    onChange={(event) => updateLanguageProfile(index, "countryYears", event.target.value)}
                  />
                </div>
                <div className="questionnaire-table-cell">
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.countryMonths}
                    onChange={(event) => updateLanguageProfile(index, "countryMonths", event.target.value)}
                  />
                </div>

                <div className="questionnaire-table-cell">{`${questionnaireText.languageSection.environmentRows.family} ${languageName}`}</div>
                <div className="questionnaire-table-cell">
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.familyYears}
                    onChange={(event) => updateLanguageProfile(index, "familyYears", event.target.value)}
                  />
                </div>
                <div className="questionnaire-table-cell">
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.familyMonths}
                    onChange={(event) => updateLanguageProfile(index, "familyMonths", event.target.value)}
                  />
                </div>

                <div className="questionnaire-table-cell">{`${questionnaireText.languageSection.environmentRows.schoolWork} ${languageName}`}</div>
                <div className="questionnaire-table-cell">
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.schoolWorkYears}
                    onChange={(event) => updateLanguageProfile(index, "schoolWorkYears", event.target.value)}
                  />
                </div>
                <div className="questionnaire-table-cell">
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={profile.schoolWorkMonths}
                    onChange={(event) => updateLanguageProfile(index, "schoolWorkMonths", event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-field">
              <span>{questionnaireText.languageSection.proficiencyPrompt}</span>
              <div className="form-grid form-grid-three">
                <label className="form-field">
                  <span>{questionnaireText.languageSection.proficiencyLabels.speaking}</span>
                  <ScaleSelect
                    value={profile.speakingProficiency}
                    onChange={(value) => updateLanguageProfile(index, "speakingProficiency", value)}
                    options={questionnaireText.scales.proficiency}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.proficiencyLabels.understandingSpokenLanguage}</span>
                  <ScaleSelect
                    value={profile.understandingSpokenLanguageProficiency}
                    onChange={(value) => updateLanguageProfile(index, "understandingSpokenLanguageProficiency", value)}
                    options={questionnaireText.scales.proficiency}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.proficiencyLabels.reading}</span>
                  <ScaleSelect
                    value={profile.readingProficiency}
                    onChange={(value) => updateLanguageProfile(index, "readingProficiency", value)}
                    options={questionnaireText.scales.proficiency}
                  />
                </label>
              </div>
            </div>

            <div className="form-field">
              <span>{questionnaireText.languageSection.learningPrompt}</span>
              <div className="form-grid form-grid-three">
                <label className="form-field">
                  <span>{questionnaireText.languageSection.learningFactors.friends}</span>
                  <ScaleSelect
                    value={profile.learningByFriends}
                    onChange={(value) => updateLanguageProfile(index, "learningByFriends", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.learningFactors.languageTapesSelfInstruction}</span>
                  <ScaleSelect
                    value={profile.learningByLanguageTapesSelfInstruction}
                    onChange={(value) => updateLanguageProfile(index, "learningByLanguageTapesSelfInstruction", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.learningFactors.family}</span>
                  <ScaleSelect
                    value={profile.learningByFamily}
                    onChange={(value) => updateLanguageProfile(index, "learningByFamily", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.learningFactors.watchingTv}</span>
                  <ScaleSelect
                    value={profile.learningByWatchingTv}
                    onChange={(value) => updateLanguageProfile(index, "learningByWatchingTv", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.learningFactors.reading}</span>
                  <ScaleSelect
                    value={profile.learningByReading}
                    onChange={(value) => updateLanguageProfile(index, "learningByReading", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.learningFactors.listeningToRadio}</span>
                  <ScaleSelect
                    value={profile.learningByListeningToRadio}
                    onChange={(value) => updateLanguageProfile(index, "learningByListeningToRadio", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>
              </div>
            </div>

            <div className="form-field">
              <span>{exposurePrompt}</span>
              <div className="form-grid form-grid-three">
                <label className="form-field">
                  <span>{questionnaireText.languageSection.exposureFactors.friends}</span>
                  <ScaleSelect
                    value={profile.exposureToFriends}
                    onChange={(value) => updateLanguageProfile(index, "exposureToFriends", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.exposureFactors.radioMusic}</span>
                  <ScaleSelect
                    value={profile.exposureToRadioMusic}
                    onChange={(value) => updateLanguageProfile(index, "exposureToRadioMusic", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.exposureFactors.family}</span>
                  <ScaleSelect
                    value={profile.exposureToFamily}
                    onChange={(value) => updateLanguageProfile(index, "exposureToFamily", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.exposureFactors.reading}</span>
                  <ScaleSelect
                    value={profile.exposureToReading}
                    onChange={(value) => updateLanguageProfile(index, "exposureToReading", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.exposureFactors.watchingTv}</span>
                  <ScaleSelect
                    value={profile.exposureToWatchingTv}
                    onChange={(value) => updateLanguageProfile(index, "exposureToWatchingTv", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <span>{questionnaireText.languageSection.exposureFactors.languageLabSelfInstruction}</span>
                  <ScaleSelect
                    value={profile.exposureToLanguageLabSelfInstruction}
                    onChange={(value) => updateLanguageProfile(index, "exposureToLanguageLabSelfInstruction", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>
              </div>
            </div>

            <label className="form-field">
              <span>{foreignAccentPrompt}</span>
              <ScaleSelect
                value={profile.foreignAccent}
                onChange={(value) => updateLanguageProfile(index, "foreignAccent", value)}
                options={questionnaireText.scales.accent}
              />
            </label>

            <label className="form-field">
              <span>{nonNativeIdentificationPrompt}</span>
              <ScaleSelect
                value={profile.nonNativeIdentificationByAccent}
                onChange={(value) => updateLanguageProfile(index, "nonNativeIdentificationByAccent", value)}
                options={questionnaireText.scales.frequency}
              />
            </label>
          </section>
        );
      })
        : null}

      <div className="actions questionnaire-step-actions">
        {currentStep > 0 ? (
          <button type="button" className="button button-secondary" onClick={goToPreviousStep} disabled={isPending}>
            {questionnaireText.stepButtons.previous}
          </button>
        ) : null}

        {isLastStep ? (
          <button type="button" className="button" onClick={startStudy} disabled={isPending}>
            {isPending ? questionnaireText.buttons.submitting : questionnaireText.buttons.submit}
          </button>
        ) : (
          <button type="button" className="button" onClick={goToNextStep} disabled={isPending}>
            {questionnaireText.stepButtons.next}
          </button>
        )}
      </div>

      {error ? <p className="status">{error}</p> : null}
    </section>
  );
}
