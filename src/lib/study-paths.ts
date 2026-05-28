export function buildStudyPath(studySlug: string, path: string) {
  return `/study/${studySlug}/${path}`;
}

export function appendQueryParams(path: string, params: Record<string, string | number | boolean | null | undefined>) {
  const url = new URL(path, "http://study.local");

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildStudyPathWithSession(
  studySlug: string,
  path: string,
  sessionId: string,
  extraParams: Record<string, string | number | boolean | null | undefined> = {}
) {
  return appendQueryParams(buildStudyPath(studySlug, path), {
    session: sessionId,
    ...extraParams
  });
}
