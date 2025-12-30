import type { Provider } from "./api";

// Separate keys for each provider
const OPENAI_KEY = "ss2sd_openai_api_key";
const GEMINI_KEY = "ss2sd_gemini_api_key";
const PROVIDER_KEY = "ss2sd_provider";
const ROWS_KEY = "ss2sd_rows";
const COLS_KEY = "ss2sd_columns";
const KEYMAP_KEY = "ss2sd_keymap";
const ERRORS_KEY = "ss2sd_errors";

// ----- Provider -----
export function loadProvider(): Provider {
  if (typeof window === "undefined") return "openai";
  const stored = window.localStorage.getItem(PROVIDER_KEY);
  if (stored === "gemini" || stored === "openai") return stored;
  return "openai";
}

export function saveProvider(provider: Provider) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROVIDER_KEY, provider);
}

// ----- API Keys (per provider) -----
export function loadApiKey(provider: Provider): string {
  if (typeof window === "undefined") return "";
  const key = provider === "openai" ? OPENAI_KEY : GEMINI_KEY;
  return window.localStorage.getItem(key) ?? "";
}

export function saveApiKey(provider: Provider, apiKey: string) {
  if (typeof window === "undefined") return;
  const key = provider === "openai" ? OPENAI_KEY : GEMINI_KEY;
  window.localStorage.setItem(key, apiKey);
}

export function clearApiKey(provider: Provider) {
  if (typeof window === "undefined") return;
  const key = provider === "openai" ? OPENAI_KEY : GEMINI_KEY;
  window.localStorage.removeItem(key);
}

export function hasApiKey(provider: Provider): boolean {
  return loadApiKey(provider).trim().length > 0;
}

// ----- Rows accumulation -----
export function loadRows(): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ROWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRows(rows: Record<string, unknown>[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
}

export function clearRows() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ROWS_KEY);
}

// ----- Columns -----
export function loadColumns(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveColumns(cols: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COLS_KEY, JSON.stringify(cols));
}

export function clearColumns() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COLS_KEY);
}

// ----- Key map -----
export function loadKeyMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEYMAP_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveKeyMap(km: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEYMAP_KEY, JSON.stringify(km));
}

export function clearKeyMap() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYMAP_KEY);
}

// ----- Errors -----
export function loadErrors(): { source_image: string; error: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ERRORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveErrors(errs: { source_image: string; error: string }[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ERRORS_KEY, JSON.stringify(errs));
}

export function clearErrors() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ERRORS_KEY);
}

// ----- Clear all extraction data -----
export function clearAllExtractionData() {
  clearRows();
  clearColumns();
  clearKeyMap();
  clearErrors();
}
