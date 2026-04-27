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
      "device_type",
      "created_at",
      "completed_at",
      "comprehension_count",
      "recall_count",
      "recognition_count",
      "matching_count",
      "telemetry_count"
    ].join(",")
  ];

  for (const bundle of bundles) {
    lines.push(
      [
        bundle.session.id,
        bundle.session.studySlug,
        bundle.session.versionId,
        bundle.session.status,
        bundle.session.device.deviceType,
        bundle.session.createdAt,
        bundle.session.completedAt,
        bundle.comprehension.length,
        bundle.recall.length,
        bundle.recognition.length,
        bundle.matching.length,
        bundle.telemetry.length
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  return lines.join("\n");
}
