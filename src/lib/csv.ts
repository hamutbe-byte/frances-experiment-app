import type { SessionBundle } from "@/lib/types";

function escapeCsv(value: string | number | boolean | null | undefined) {
  const normalised = value ?? "";
  const text = String(normalised);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export function bundlesToCsv(bundles: SessionBundle[]) {
  const lines = [
    [
      "session_id",
      "study_slug",
      "version_id",
      "status",
      "participant_age",
      "participant_gender",
      "participant_education_level",
      "participant_academic_english_placement",
      "participant_english_course_level",
      "participant_country_of_birth",
      "participant_age_at_immigration",
      "participant_immigration_country",
      "participant_immigration_years",
      "participant_languages",
      "device_type",
      "created_at",
      "completed_at",
      "comprehension_count",
      "distractor_count",
      "recall_count",
      "recognition_count",
      "matching_count",
      "telemetry_count",
      "participant_writing_preference",
      "participant_listening_preference",
      "participant_has_attention_disorder",
      "participant_mother_tongue_exposure_age"
    ].join(",")
  ];

  for (const bundle of bundles) {
    lines.push(
      [
        bundle.session.id,
        bundle.session.studySlug,
        bundle.session.versionId,
        bundle.session.status,
        bundle.questionnaire?.age,
        bundle.questionnaire?.gender,
        bundle.questionnaire?.educationLevel,
        bundle.questionnaire?.academicEnglishPlacement,
        bundle.questionnaire?.englishCourseLevel,
        bundle.questionnaire?.countryOfBirth,
        bundle.questionnaire?.ageAtImmigration,
        bundle.questionnaire?.immigrationCountry,
        bundle.questionnaire?.immigrationYears,
        bundle.questionnaire?.languagesByDominance.join(" | "),
        bundle.session.device.deviceType,
        bundle.session.createdAt,
        bundle.session.completedAt,
        bundle.comprehension.length,
        bundle.distractor.length,
        bundle.recall.length,
        bundle.recognition.length,
        bundle.matching.length,
        bundle.telemetry.length,
        bundle.questionnaire?.writingPreference?.filter((entry) => entry.language || entry.percentage)
          .map((entry) => `${entry.language}: ${entry.percentage}`).join(" | "),
        bundle.questionnaire?.listeningPreference?.filter((entry) => entry.language || entry.percentage)
          .map((entry) => `${entry.language}: ${entry.percentage}`).join(" | "),
        bundle.questionnaire?.hasAttentionDisorder,
        bundle.questionnaire?.languageProfiles[0]?.motherTongueExposureAge
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  return lines.join("\n");
}

export function bundlesToResponsesCsv(bundles: SessionBundle[]) {
  const lines = [
    [
      "session_id",
      "version_id",
      "phase",
      "item_index",
      "pseudoword",
      "picture_id",
      "condition",
      "answer",
      "correct",
      "response_time_ms",
      "text",
      "selected_option",
      "paste_count",
      "timestamp"
    ].join(",")
  ];

  for (const bundle of bundles) {
    for (const response of bundle.comprehension) {
      lines.push(
        [
          bundle.session.id,
          bundle.session.versionId,
          "comprehension",
          response.trialIndex,
          "",
          "",
          "",
          response.answer,
          response.correct,
          response.responseTimeMs,
          "",
          "",
          "",
          response.answeredAt
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    for (const response of bundle.recall) {
      lines.push(
        [
          bundle.session.id,
          bundle.session.versionId,
          "recall",
          response.promptIndex,
          response.pseudoword,
          "",
          "",
          "",
          "",
          response.totalResponseTimeMs,
          response.text,
          "",
          response.pasteCount,
          response.submittedAt
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    for (const response of bundle.distractor) {
      lines.push(
        [
          bundle.session.id,
          bundle.session.versionId,
          "distractor",
          response.trialIndex,
          "",
          "",
          response.direction,
          response.responseSequence.join("-"),
          response.correct,
          response.responseTimeMs,
          response.shownSequence.join("-"),
          response.sequenceLength,
          "",
          response.answeredAt
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    for (const response of bundle.recognition) {
      lines.push(
        [
          bundle.session.id,
          bundle.session.versionId,
          "recognition",
          response.promptIndex,
          response.pseudoword,
          "",
          "",
          "",
          response.correct,
          response.responseTimeMs,
          "",
          response.selectedOptionText,
          "",
          response.answeredAt
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    for (const response of bundle.matching) {
      lines.push(
        [
          bundle.session.id,
          bundle.session.versionId,
          "matching",
          response.trialIndex,
          "",
          response.pictureId,
          response.condition,
          response.answer,
          response.correct,
          response.responseTimeMs,
          "",
          "",
          "",
          response.answeredAt
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
  }

  return lines.join("\n");
}
