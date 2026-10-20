const KEY = "utsavos.describe";

/** Passes the landing-page description to the brief wizard without putting it in the URL. */
export function putDescription(text: string): void {
  try {
    sessionStorage.setItem(KEY, text);
  } catch {
    // Storage blocked: the wizard simply starts empty.
  }
}

export function takeDescription(): string {
  try {
    const text = sessionStorage.getItem(KEY) ?? "";
    sessionStorage.removeItem(KEY);
    return text;
  } catch {
    return "";
  }
}
