"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useResolvedContent } from "@/components/content-provider";
import { EditableQuestionnaireText } from "@/components/editable-questionnaire-text";
import { QuestionnairePromptText } from "@/components/questionnaire-prompt-text";
import { getDeviceSnapshot } from "@/lib/browser";
import { createSessionRequest, saveCurrentSessionId } from "@/lib/session-client";
import type { ParticipantQuestionnaireInput } from "@/lib/types";
import { countryOptions } from "@/content/country-options";

// EditableContentText is still the primitive behind the questionnaire text wrappers.

interface StartPhaseClientProps {
  studySlug: string;
}

interface PercentageEntryFormState {
  language: string;
  percentage: string;
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
  motherTongueExposureAge: string;
}

interface QuestionnaireFormState {
  lastName: string;
  firstName: string;
  todayDate: string;
  age: string;
  gender: string;
  languagesByDominance: string[];
  languagesByAcquisition: string[];
  currentExposure: PercentageEntryFormState[];
  readingPreference: PercentageEntryFormState[];
  speakingPreference: PercentageEntryFormState[];
  writingPreference: PercentageEntryFormState[];
  listeningPreference: PercentageEntryFormState[];
  yearsOfEducation: string;
  academicEnglishPlacement: string;
  englishCourseLevel: string;
  countryOfBirth: string;
  ageAtImmigration: string;
  immigrationCountry: string;
  immigrationYears: string;
  educationLevel: string;
  educationLevelOther: string;
  usaImmigrationDate: string;
  otherImmigrationDetails: string;
  hasVisionProblem: boolean;
  hasHearingImpairment: boolean;
  hasLanguageDisability: boolean;
  hasLearningDisability: boolean;
  hasAttentionDisorder: boolean;
  disabilityExplanation: string;
  languageProfiles: LanguageProfileFormState[];
}

type PercentageField = "currentExposure" | "readingPreference" | "speakingPreference" | "writingPreference" | "listeningPreference";

const rankedSlotCount = 5;
const initialLanguageProfileCount = 1;
const maxLanguageProfileCount = 4;

function makeRankedLanguageList() {
  return Array.from({ length: rankedSlotCount }, () => "");
}

function makePercentageEntries(): PercentageEntryFormState[] {
  return Array.from({ length: rankedSlotCount }, () => ({
    language: "",
    percentage: ""
  }));
}


function makeEmptyLanguageProfile(language = ""): LanguageProfileFormState {
  return {
    language,
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
    motherTongueExposureAge: ""
  };
}

function isBlankLanguageProfile(profile: LanguageProfileFormState) {
  return Object.values(profile).every((value) => value.trim() === "");
}

function isNonHebrewLanguage(language: string) {
  return language.trim() !== "" && language !== "עברית";
}

function renumberPrompt(prompt: string, number: number) {
  return prompt.replace(/^\(\d+(?:\.\d+)?\)/, `(${number})`);
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
  options: ReadonlyArray<{ value: string; label: string }>;
  blankLabel?: string;
}) {
  const { value, onChange, blankLabel = "בחרו שפה" } = props;

  return (
    <select className="select-input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{blankLabel}</option>
      {props.options.map((option) => (
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
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  const { value, onChange } = props;

  return (
    <select className="select-input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">בחרו אחוז</option>
      {props.options.map((option) => (
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
  const { snapshot } = useResolvedContent();
  const questionnaireText = snapshot.questionnaireText as typeof import("@/content/questionnaire-text").questionnaireText;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionnaireFormState>({
    lastName: "",
    firstName: "",
    todayDate: getTodayDateValue(),
    age: "",
    gender: "",
    languagesByDominance: makeRankedLanguageList(),
    languagesByAcquisition: makeRankedLanguageList(),
    currentExposure: makePercentageEntries(),
    readingPreference: makePercentageEntries(),
    speakingPreference: makePercentageEntries(),
    writingPreference: makePercentageEntries(),
    listeningPreference: makePercentageEntries(),
    yearsOfEducation: "",
    academicEnglishPlacement: "",
    englishCourseLevel: "",
    countryOfBirth: "",
    ageAtImmigration: "",
    immigrationCountry: "not_applicable",
    immigrationYears: "",
    educationLevel: "",
    educationLevelOther: "",
    usaImmigrationDate: "",
    otherImmigrationDetails: "",
    hasVisionProblem: false,
    hasHearingImpairment: false,
    hasLanguageDisability: false,
    hasLearningDisability: false,
    hasAttentionDisorder: false,
    disabilityExplanation: "",
    languageProfiles: Array.from({ length: initialLanguageProfileCount }, () => makeEmptyLanguageProfile("עברית"))
  });

  const showAgeAtImmigration = form.countryOfBirth !== "" && form.countryOfBirth !== "IL";
  const showAcademicEnglishPlacement = form.englishCourseLevel === "advanced_b";
  const firstLanguage = form.languageProfiles[0]?.language.trim() ?? "";
  const firstLanguageIsEnglish = firstLanguage === "אנגלית" || firstLanguage.toLowerCase() === "english";

  useEffect(() => {
    if (!firstLanguage) {
      return;
    }

    if (firstLanguageIsEnglish) {
      setForm((current) => {
        const languageProfiles = current.languageProfiles.filter(
          (profile, index) => index === 0 || profile.language !== "אנגלית"
        );

        return languageProfiles.length === current.languageProfiles.length
          ? current
          : { ...current, languageProfiles };
      });
      return;
    }

    setForm((current) => {
      if (current.languageProfiles.length !== 1) {
        return current;
      }

      return {
        ...current,
        languageProfiles: [...current.languageProfiles, makeEmptyLanguageProfile("אנגלית")]
      };
    });
  }, [firstLanguage, firstLanguageIsEnglish]);

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

  function addLanguageProfile() {
    setForm((current) => {
      if (current.languageProfiles.length >= maxLanguageProfileCount) {
        return current;
      }

      return {
        ...current,
        languageProfiles: [...current.languageProfiles, makeEmptyLanguageProfile()]
      };
    });
  }

  function removeLanguageProfile(index: number) {
    if (index === 0) {
      return;
    }

    setForm((current) => {
      if (current.languageProfiles.length <= 1) {
        return current;
      }

      return {
        ...current,
        languageProfiles: current.languageProfiles.filter((_, profileIndex) => profileIndex !== index)
      };
    });
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
      ["speakingPreference", "העדפת דיבור"],
      ["writingPreference", "העדפת כתיבה"],
      ["listeningPreference", "העדפת האזנה"]
    ];

    for (const [field, label] of groups) {
      const validationError = validatePercentageGroup(form[field], label);
      if (validationError) {
        return validationError;
      }
    }

    return null;
  }

  function buildQuestionnairePayload(): ParticipantQuestionnaireInput {
    return {
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      todayDate: form.todayDate.trim(),
      age: parseOptionalNumber(form.age),
      dateOfBirth: "",
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
      writingPreference: form.writingPreference.map(({ language, percentage }) => ({
        language: language.trim(), percentage: percentage.trim()
      })),
      listeningPreference: form.listeningPreference.map(({ language, percentage }) => ({
        language: language.trim(), percentage: percentage.trim()
      })),
      cultures: [],
      yearsOfEducation: parseOptionalNumber(form.yearsOfEducation),
      academicEnglishPlacement: showAcademicEnglishPlacement ? form.academicEnglishPlacement : "",
      englishCourseLevel: form.englishCourseLevel,
      countryOfBirth: form.countryOfBirth,
      ageAtImmigration: showAgeAtImmigration ? parseOptionalNumber(form.ageAtImmigration) : null,
      immigrationCountry: form.immigrationCountry.trim(),
      immigrationYears: parseOptionalNumber(form.immigrationYears),
      educationLevel: form.educationLevel,
      educationLevelOther: form.educationLevelOther.trim(),
      usaImmigrationDate: form.usaImmigrationDate.trim(),
      otherImmigrationDetails: form.otherImmigrationDetails.trim(),
      hasVisionProblem: form.hasVisionProblem,
      hasHearingImpairment: form.hasHearingImpairment,
      hasLanguageDisability: form.hasLanguageDisability,
      hasLearningDisability: form.hasLearningDisability,
      hasAttentionDisorder: form.hasAttentionDisorder,
      disabilityExplanation: form.disabilityExplanation.trim(),
      languageProfiles: form.languageProfiles.filter((profile) => !isBlankLanguageProfile(profile)).map((profile) => ({
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
        foreignAccent: null,
        nonNativeIdentificationByAccent: null,
        motherTongueExposureAge: profile === form.languageProfiles[0] && isNonHebrewLanguage(profile.language)
          ? parseOptionalNumber(profile.motherTongueExposureAge)
          : null
      }))
    };
  }

  async function startStudy() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
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

  return (
    <section className="panel stack questionnaire-panel">
      <section className="questionnaire-section-break is-first">
        <EditableQuestionnaireText contentKey="questionnaireText.steps.0.title" tag="h2">
          {questionnaireText.steps[0].title}
        </EditableQuestionnaireText>
      </section>

      <section className="form-section">
        <div className="form-grid form-grid-three">
          <label className="form-field">
            <EditableQuestionnaireText contentKey="questionnaireText.participant.lastName">
              {questionnaireText.participant.lastName}
            </EditableQuestionnaireText>
            <input className="text-input" type="text" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
          </label>

          <label className="form-field">
            <EditableQuestionnaireText contentKey="questionnaireText.participant.firstName">
              {questionnaireText.participant.firstName}
            </EditableQuestionnaireText>
            <input className="text-input" type="text" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
          </label>

              <label className="form-field">
                <EditableQuestionnaireText contentKey="questionnaireText.participant.age">
                  {questionnaireText.participant.age}
                </EditableQuestionnaireText>
                <input className="text-input" type="number" min="0" inputMode="numeric" value={form.age} onChange={(event) => updateField("age", event.target.value)} />
              </label>


          <div className="form-field">
            <EditableQuestionnaireText contentKey="questionnaireText.participant.gender">
              {questionnaireText.participant.gender}
            </EditableQuestionnaireText>
            <div className="questionnaire-choice-grid">
              {questionnaireText.participant.genderOptions.map((option, optionIndex) => (
                <label key={option.value} className="questionnaire-choice">
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={form.gender === option.value}
                    onChange={(event) => updateField("gender", event.target.value)}
                  />
                  <EditableQuestionnaireText contentKey={`questionnaireText.participant.genderOptions.${optionIndex}.label`}>
                    {option.label}
                  </EditableQuestionnaireText>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="form-section">
        <QuestionnairePromptText contentKey="questionnaireText.prompts.dominance">
          {questionnaireText.prompts.dominance}
        </QuestionnairePromptText>
        <div className="questionnaire-slot-grid">
          {questionnaireText.rankingSlots.map((slotLabel, index) => (
            <label key={`dominance-${slotLabel}`} className="form-field">
              <EditableQuestionnaireText contentKey={`questionnaireText.rankingSlots.${index}`}>
                {slotLabel}
              </EditableQuestionnaireText>
              <LanguageSelect
                value={form.languagesByDominance[index]}
                options={questionnaireText.languageOptions}
                onChange={(value) => updateRankedLanguages("languagesByDominance", index, value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="form-section">
        <QuestionnairePromptText contentKey="questionnaireText.prompts.acquisition">
          {questionnaireText.prompts.acquisition}
        </QuestionnairePromptText>
        <div className="questionnaire-slot-grid">
          {questionnaireText.rankingSlots.map((slotLabel, index) => (
            <label key={`acquisition-${slotLabel}`} className="form-field">
              <EditableQuestionnaireText contentKey={`questionnaireText.rankingSlots.${index}`}>
                {slotLabel}
              </EditableQuestionnaireText>
              <LanguageSelect
                value={form.languagesByAcquisition[index]}
                options={questionnaireText.languageOptions}
                onChange={(value) => updateRankedLanguages("languagesByAcquisition", index, value)}
              />
            </label>
          ))}
        </div>
      </section>

      {(
        [
          ["currentExposure", questionnaireText.prompts.currentExposure],
          ["readingPreference", questionnaireText.prompts.readingPreference],
          ["speakingPreference", questionnaireText.prompts.speakingPreference],
          ["writingPreference", questionnaireText.prompts.writingPreference],
          ["listeningPreference", questionnaireText.prompts.listeningPreference]
        ] as const
      ).map(([field, prompt]) => (
        <section key={field} className="form-section">
          <QuestionnairePromptText contentKey={`questionnaireText.prompts.${field}`}>
            {prompt}
          </QuestionnairePromptText>
          <EditableQuestionnaireText contentKey="questionnaireText.prompts.percentagesHint" tag="p" className="questionnaire-note">
            {questionnaireText.prompts.percentagesHint}
          </EditableQuestionnaireText>
          <div className="questionnaire-table-wrap">
            <table className="questionnaire-matrix-table">
              <tbody>
                <tr>
                  <th>
                    <EditableQuestionnaireText contentKey="questionnaireText.tableLabels.listLanguageHere">
                      {questionnaireText.tableLabels.listLanguageHere}
                    </EditableQuestionnaireText>
                  </th>
                  {form[field].map((entry, index) => (
                    <td key={`${field}-language-${index}`}>
                      <LanguageSelect
                        value={entry.language}
                        options={questionnaireText.languageOptions}
                        onChange={(value) => updatePercentageEntries(field, index, "language", value)}
                      />
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>
                    <EditableQuestionnaireText contentKey="questionnaireText.tableLabels.listPercentageHere">
                      {questionnaireText.tableLabels.listPercentageHere}
                    </EditableQuestionnaireText>
                  </th>
                  {form[field].map((entry, index) => (
                    <td key={`${field}-percentage-${index}`}>
                      <PercentageSelect
                        value={entry.percentage}
                        options={questionnaireText.percentageOptions}
                        onChange={(value) => updatePercentageEntries(field, index, "percentage", value)}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}


      <section className="questionnaire-section-break">
        <EditableQuestionnaireText contentKey="questionnaireText.steps.1.title" tag="h2">
          {questionnaireText.steps[1].title}
        </EditableQuestionnaireText>
      </section>

      <section className="form-section">
        <label className="form-field">
          <QuestionnairePromptText contentKey="questionnaireText.prompts.countryOfBirth">
            {renumberPrompt(questionnaireText.prompts.countryOfBirth, 8)}
          </QuestionnairePromptText>
          <select
            className="select-input"
            value={form.countryOfBirth}
            onChange={(event) => updateField("countryOfBirth", event.target.value)}
          >
            <option value="">בחרו מדינה</option>
            {countryOptions.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {showAgeAtImmigration ? (
        <section className="form-section">
          <label className="form-field">
            <QuestionnairePromptText contentKey="questionnaireText.prompts.ageAtImmigration">
              {renumberPrompt(questionnaireText.prompts.ageAtImmigration, 8.1)}
            </QuestionnairePromptText>
            <input
              className="text-input"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={form.ageAtImmigration}
              onChange={(event) => updateField("ageAtImmigration", event.target.value)}
            />
          </label>
        </section>
      ) : null}

      <section className="form-section">
        <QuestionnairePromptText contentKey="questionnaireText.prompts.otherImmigrationDetails">
          {renumberPrompt(questionnaireText.prompts.otherImmigrationDetails, 9)}
        </QuestionnairePromptText>
        <div className="form-grid form-grid-two">
          <label className="form-field">
            <EditableQuestionnaireText contentKey="questionnaireText.prompts.immigrationCountryLabel">
              {questionnaireText.prompts.immigrationCountryLabel}
            </EditableQuestionnaireText>
            <select
              className="select-input"
              value={form.immigrationCountry}
              onChange={(event) => updateField("immigrationCountry", event.target.value)}
            >
              <option value="not_applicable">לא רלוונטי</option>
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <EditableQuestionnaireText contentKey="questionnaireText.prompts.immigrationYearsLabel">
              {questionnaireText.prompts.immigrationYearsLabel}
            </EditableQuestionnaireText>
            <input
              className="text-input"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={form.immigrationYears}
              onChange={(event) => updateField("immigrationYears", event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="form-section">
        <label className="form-field">
          <QuestionnairePromptText contentKey="questionnaireText.prompts.yearsOfEducation">
            {renumberPrompt(questionnaireText.prompts.yearsOfEducation, 10)}
          </QuestionnairePromptText>
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
          <QuestionnairePromptText contentKey="questionnaireText.prompts.englishCourseLevel">
            {renumberPrompt(questionnaireText.prompts.englishCourseLevel, 11)}
          </QuestionnairePromptText>
          <div className="questionnaire-choice-grid">
            {questionnaireText.englishCourseLevelOptions.map((option, optionIndex) => (
              <label key={option.value} className="questionnaire-choice">
                <input
                  type="radio"
                  name="english-course-level"
                  value={option.value}
                  checked={form.englishCourseLevel === option.value}
                  onChange={(event) => updateField("englishCourseLevel", event.target.value)}
                />
                <EditableQuestionnaireText contentKey={`questionnaireText.englishCourseLevelOptions.${optionIndex}.label`}>
                  {option.label}
                </EditableQuestionnaireText>
              </label>
            ))}
          </div>
        </div>

        {showAcademicEnglishPlacement ? (
          <div className="form-field">
            <QuestionnairePromptText contentKey="questionnaireText.prompts.academicEnglishPlacement">
              {renumberPrompt(questionnaireText.prompts.academicEnglishPlacement, 11.1)}
            </QuestionnairePromptText>
            <div className="questionnaire-choice-grid">
              {questionnaireText.academicEnglishPlacementOptions.map((option, optionIndex) => (
                <label key={option.value} className="questionnaire-choice">
                  <input
                    type="radio"
                    name="academic-english-placement"
                    value={option.value}
                    checked={form.academicEnglishPlacement === option.value}
                    onChange={(event) => updateField("academicEnglishPlacement", event.target.value)}
                  />
                  <EditableQuestionnaireText contentKey={`questionnaireText.academicEnglishPlacementOptions.${optionIndex}.label`}>
                    {option.label}
                  </EditableQuestionnaireText>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="form-section">
        <QuestionnairePromptText contentKey="questionnaireText.prompts.difficulties">
          {renumberPrompt(questionnaireText.prompts.difficulties, 12)}
        </QuestionnairePromptText>
        <div className="questionnaire-choice-grid">
          {questionnaireText.disabilityOptions.map((option, optionIndex) => (
            <label key={option.key} className="questionnaire-choice">
              <input
                type="checkbox"
                checked={form[option.key]}
                onChange={(event) => updateField(option.key, event.target.checked)}
              />
              <EditableQuestionnaireText contentKey={`questionnaireText.disabilityOptions.${optionIndex}.label`}>
                {option.label}
              </EditableQuestionnaireText>
            </label>
          ))}
        </div>

        <label className="form-field">
          <EditableQuestionnaireText contentKey="questionnaireText.prompts.disabilityExplanationLabel">
            {questionnaireText.prompts.disabilityExplanationLabel}
          </EditableQuestionnaireText>
          <textarea
            className="textarea-input"
            rows={3}
            value={form.disabilityExplanation}
            onChange={(event) => updateField("disabilityExplanation", event.target.value)}
          />
        </label>
      </section>

      <section className="questionnaire-section-break">
        <EditableQuestionnaireText contentKey="questionnaireText.steps.2.title" tag="h2">
          {questionnaireText.steps[2].title}
        </EditableQuestionnaireText>
      </section>

      {form.languageProfiles.map((profile, index) => {
        const profileHeading = questionnaireText.languageSection.profileHeading.replace("{number}", String(index + 1));
        const isEnglishProfile = index > 0 && profile.language === "אנגלית";
        const languagePromptVariant = index === 0 ? "motherTongue" : isEnglishProfile ? "english" : "additional";
        const environmentPrompt = questionnaireText.languageSection.environmentPrompts[languagePromptVariant];
        const proficiencyPrompt = questionnaireText.languageSection.proficiencyPrompts[languagePromptVariant];
        const learningPrompt = questionnaireText.languageSection.learningPrompts[languagePromptVariant];
        const exposurePrompt = questionnaireText.languageSection.exposurePrompts[languagePromptVariant];
        const isLastProfile = index === form.languageProfiles.length - 1;

        return (
          <section key={`language-profile-${index}`} className="form-section">
            <div className="questionnaire-language-header">
              <div className="questionnaire-language-heading">
                <EditableQuestionnaireText contentKey="questionnaireText.languageSection.profileHeading" tag="h2">
                  {profileHeading}
                </EditableQuestionnaireText>
                <EditableQuestionnaireText
                  contentKey={index === 1 && profile.language === "אנגלית"
                    ? "questionnaireText.languageSection.englishInstruction"
                    : "questionnaireText.languageSection.profileIntro"}
                  tag="p"
                >
                  {index === 1 && profile.language === "אנגלית"
                    ? questionnaireText.languageSection.englishInstruction
                    : questionnaireText.languageSection.profileIntro}
                </EditableQuestionnaireText>
              </div>
              {index > 0 ? (
                <button
                  type="button"
                  className="button button-secondary questionnaire-language-action questionnaire-language-remove"
                  onClick={() => removeLanguageProfile(index)}
                >
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.removeLanguageButton">
                    {questionnaireText.languageSection.removeLanguageButton}
                  </EditableQuestionnaireText>
                </button>
              ) : null}
            </div>

            {index === 1 && profile.language === "אנגלית" ? null : (
              <label className="form-field">
                <EditableQuestionnaireText
                  contentKey={index === 0 ? "questionnaireText.languageSection.motherTonguePrompt" : "questionnaireText.languageSection.heading"}
                >
                  {index === 0 ? questionnaireText.languageSection.motherTonguePrompt : questionnaireText.languageSection.heading}
                </EditableQuestionnaireText>
                <LanguageSelect
                  value={profile.language}
                  options={questionnaireText.languageOptions}
                  onChange={(value) => updateLanguageProfile(index, "language", value)}
                />
              </label>
            )}

            {index > 0 ? (
              <div className="form-field">
                <QuestionnairePromptText contentKey="questionnaireText.languageSection.ageWhenYou">
                  {questionnaireText.languageSection.ageWhenYou}
                </QuestionnairePromptText>
                <div className="form-grid form-grid-two">
                  <label className="form-field">
                    <EditableQuestionnaireText contentKey="questionnaireText.languageSection.ageLabels.beganAcquiring">
                      {questionnaireText.languageSection.ageLabels.beganAcquiring}
                    </EditableQuestionnaireText>
                    <input
                      className="text-input"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={profile.ageBeganAcquiring}
                      onChange={(event) => updateLanguageProfile(index, "ageBeganAcquiring", event.target.value)}
                    />
                  </label>

                  {!isEnglishProfile ? (
                    <label className="form-field">
                      <EditableQuestionnaireText contentKey="questionnaireText.languageSection.ageLabels.becameFluent">
                        {questionnaireText.languageSection.ageLabels.becameFluent}
                      </EditableQuestionnaireText>
                      <input
                        className="text-input"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={profile.ageBecameFluent}
                        onChange={(event) => updateLanguageProfile(index, "ageBecameFluent", event.target.value)}
                      />
                    </label>
                  ) : null}

                  <label className="form-field">
                    <EditableQuestionnaireText contentKey="questionnaireText.languageSection.ageLabels.beganReading">
                      {questionnaireText.languageSection.ageLabels.beganReading}
                    </EditableQuestionnaireText>
                    <input
                      className="text-input"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={profile.ageBeganReading}
                      onChange={(event) => updateLanguageProfile(index, "ageBeganReading", event.target.value)}
                    />
                  </label>

                  {!isEnglishProfile ? (
                    <label className="form-field">
                      <EditableQuestionnaireText contentKey="questionnaireText.languageSection.ageLabels.becameFluentReading">
                        {questionnaireText.languageSection.ageLabels.becameFluentReading}
                      </EditableQuestionnaireText>
                      <input
                        className="text-input"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={profile.ageBecameFluentReading}
                        onChange={(event) => updateLanguageProfile(index, "ageBecameFluentReading", event.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="form-field">
              <QuestionnairePromptText contentKey={`questionnaireText.languageSection.environmentPrompts.${languagePromptVariant}`}>
                {index === 0 ? renumberPrompt(environmentPrompt, 1) : environmentPrompt}
              </QuestionnairePromptText>
              <div className="questionnaire-table-grid questionnaire-environment-grid">
                <div className="questionnaire-table-cell questionnaire-table-header" />
                <EditableQuestionnaireText
                  contentKey="questionnaireText.languageSection.environmentColumns.years"
                  tag="div"
                  className="questionnaire-table-cell questionnaire-table-header"
                >
                  {questionnaireText.languageSection.environmentColumns.years}
                </EditableQuestionnaireText>

                <EditableQuestionnaireText
                  contentKey="questionnaireText.languageSection.environmentRows.country"
                  tag="div"
                  className="questionnaire-table-cell"
                >
                  {questionnaireText.languageSection.environmentRows.country}
                </EditableQuestionnaireText>
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

                <EditableQuestionnaireText
                  contentKey="questionnaireText.languageSection.environmentRows.family"
                  tag="div"
                  className="questionnaire-table-cell"
                >
                  {questionnaireText.languageSection.environmentRows.family}
                </EditableQuestionnaireText>
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

                <EditableQuestionnaireText
                  contentKey="questionnaireText.languageSection.environmentRows.schoolWork"
                  tag="div"
                  className="questionnaire-table-cell"
                >
                  {questionnaireText.languageSection.environmentRows.schoolWork}
                </EditableQuestionnaireText>
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
              </div>
              {index === 0 && isNonHebrewLanguage(profile.language) ? (
                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.motherTongueExposureAge">
                    {questionnaireText.languageSection.motherTongueExposureAge}
                  </EditableQuestionnaireText>
                  <input
                    className="text-input"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={profile.motherTongueExposureAge}
                    onChange={(event) => updateLanguageProfile(index, "motherTongueExposureAge", event.target.value)}
                  />
                </label>
              ) : null}
            </div>

            <div className="form-field">
              <QuestionnairePromptText contentKey={`questionnaireText.languageSection.proficiencyPrompts.${languagePromptVariant}`}>
                {index === 0 ? renumberPrompt(proficiencyPrompt, 2) : proficiencyPrompt}
              </QuestionnairePromptText>
              <div className="form-grid form-grid-three">
                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.proficiencyLabels.speaking">
                    {questionnaireText.languageSection.proficiencyLabels.speaking}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.speakingProficiency}
                    onChange={(value) => updateLanguageProfile(index, "speakingProficiency", value)}
                    options={questionnaireText.scales.proficiency}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.proficiencyLabels.understandingSpokenLanguage">
                    {questionnaireText.languageSection.proficiencyLabels.understandingSpokenLanguage}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.understandingSpokenLanguageProficiency}
                    onChange={(value) => updateLanguageProfile(index, "understandingSpokenLanguageProficiency", value)}
                    options={questionnaireText.scales.proficiency}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.proficiencyLabels.reading">
                    {questionnaireText.languageSection.proficiencyLabels.reading}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.readingProficiency}
                    onChange={(value) => updateLanguageProfile(index, "readingProficiency", value)}
                    options={questionnaireText.scales.proficiency}
                  />
                </label>
              </div>
            </div>

            <div className="form-field">
              <QuestionnairePromptText contentKey={`questionnaireText.languageSection.learningPrompts.${languagePromptVariant}`}>
                {index === 0 ? renumberPrompt(learningPrompt, 3) : learningPrompt}
              </QuestionnairePromptText>
              <div className="form-grid form-grid-three">
                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.learningFactors.family">
                    {questionnaireText.languageSection.learningFactors.family}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.learningByFamily}
                    onChange={(value) => updateLanguageProfile(index, "learningByFamily", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.learningFactors.languageTapesSelfInstruction">
                    {questionnaireText.languageSection.learningFactors.languageTapesSelfInstruction}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.learningByLanguageTapesSelfInstruction}
                    onChange={(value) => updateLanguageProfile(index, "learningByLanguageTapesSelfInstruction", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.learningFactors.friends">
                    {questionnaireText.languageSection.learningFactors.friends}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.learningByFriends}
                    onChange={(value) => updateLanguageProfile(index, "learningByFriends", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.learningFactors.watchingTv">
                    {questionnaireText.languageSection.learningFactors.watchingTv}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.learningByWatchingTv}
                    onChange={(value) => updateLanguageProfile(index, "learningByWatchingTv", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.learningFactors.reading">
                    {questionnaireText.languageSection.learningFactors.reading}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.learningByReading}
                    onChange={(value) => updateLanguageProfile(index, "learningByReading", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.learningFactors.listeningToRadio">
                    {questionnaireText.languageSection.learningFactors.listeningToRadio}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.learningByListeningToRadio}
                    onChange={(value) => updateLanguageProfile(index, "learningByListeningToRadio", value)}
                    options={questionnaireText.scales.contributor}
                  />
                </label>
              </div>
            </div>

            <div className="form-field">
              <QuestionnairePromptText contentKey={`questionnaireText.languageSection.exposurePrompts.${languagePromptVariant}`}>
                {index === 0 ? renumberPrompt(exposurePrompt, 4) : exposurePrompt}
              </QuestionnairePromptText>
              <div className="form-grid form-grid-three">
                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.exposureFactors.family">
                    {questionnaireText.languageSection.exposureFactors.family}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.exposureToFamily}
                    onChange={(value) => updateLanguageProfile(index, "exposureToFamily", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.exposureFactors.radioMusic">
                    {questionnaireText.languageSection.exposureFactors.radioMusic}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.exposureToRadioMusic}
                    onChange={(value) => updateLanguageProfile(index, "exposureToRadioMusic", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.exposureFactors.friends">
                    {questionnaireText.languageSection.exposureFactors.friends}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.exposureToFriends}
                    onChange={(value) => updateLanguageProfile(index, "exposureToFriends", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.exposureFactors.reading">
                    {questionnaireText.languageSection.exposureFactors.reading}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.exposureToReading}
                    onChange={(value) => updateLanguageProfile(index, "exposureToReading", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.exposureFactors.watchingTv">
                    {questionnaireText.languageSection.exposureFactors.watchingTv}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.exposureToWatchingTv}
                    onChange={(value) => updateLanguageProfile(index, "exposureToWatchingTv", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>

                <label className="form-field">
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.exposureFactors.languageLabSelfInstruction">
                    {questionnaireText.languageSection.exposureFactors.languageLabSelfInstruction}
                  </EditableQuestionnaireText>
                  <ScaleSelect
                    value={profile.exposureToLanguageLabSelfInstruction}
                    onChange={(value) => updateLanguageProfile(index, "exposureToLanguageLabSelfInstruction", value)}
                    options={questionnaireText.scales.frequency}
                  />
                </label>
              </div>
            </div>


            {isLastProfile && form.languageProfiles.length < maxLanguageProfileCount ? (
              <div className="questionnaire-language-actions">
                <EditableQuestionnaireText
                  contentKey="questionnaireText.languageSection.additionalLanguagesInstruction"
                  tag="p"
                  className="questionnaire-note"
                >
                  {questionnaireText.languageSection.additionalLanguagesInstruction}
                </EditableQuestionnaireText>
                <button
                  type="button"
                  className="button button-secondary questionnaire-language-action questionnaire-language-add"
                  onClick={addLanguageProfile}
                >
                  <EditableQuestionnaireText contentKey="questionnaireText.languageSection.addLanguageButton">
                    {questionnaireText.languageSection.addLanguageButton}
                  </EditableQuestionnaireText>
                </button>
              </div>
            ) : null}
          </section>
        );
      })}

      <div className="actions">
        <button type="button" className="button" onClick={startStudy} disabled={isPending}>
          {isPending ? questionnaireText.buttons.submitting : questionnaireText.buttons.submit}
        </button>
      </div>

      {error ? <p className="status">{error}</p> : null}
    </section>
  );
}
