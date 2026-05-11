import { NextResponse } from "next/server";

import { bundlesToCsv, bundlesToResponsesCsv } from "@/lib/csv";
import { listSessionBundles } from "@/lib/store";

export function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const type = url.searchParams.get("type") ?? "summary";
  const bundles = listSessionBundles();

  if (format === "csv") {
    const body = type === "responses" ? bundlesToResponsesCsv(bundles) : bundlesToCsv(bundles);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="frances-${type}.csv"`
      }
    });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    sessions: bundles
  });
}
