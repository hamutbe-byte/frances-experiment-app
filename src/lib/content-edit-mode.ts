export const contentEditModeKey = "content-editor-enabled";

const envEnabled = process.env.NEXT_PUBLIC_CONTENT_EDITOR_ENABLED?.trim() === "true";

function isLocalDevelopmentHost() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
}

export function isContentEditModeEnabled(storage?: Pick<Storage, "getItem"> | null) {
  const storedValue = storage?.getItem(contentEditModeKey);

  if (storedValue === "1" && isLocalDevelopmentHost()) {
    return true;
  }

  return envEnabled;
}

export function enableContentEditMode(storage?: Pick<Storage, "setItem"> | null) {
  storage?.setItem(contentEditModeKey, "1");
}

export function disableContentEditMode(storage?: Pick<Storage, "removeItem"> | null) {
  storage?.removeItem(contentEditModeKey);
}
