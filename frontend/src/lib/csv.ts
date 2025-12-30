import Papa from "papaparse";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Escape quotes by doubling them, wrap in quotes if needed.
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

// ----- CSV Parsing -----

export type ParsedCsv = {
  headers: string[];
  rows: Array<Record<string, unknown>>;
};

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Array<Record<string, unknown>>;
        resolve({ headers, rows });
      },
      error: (err) => reject(err),
    });
  });
}

// Convert headers back to comma-separated fields for the fields input
// Filters out source_image since that's auto-added by the system
export function headersToFieldsCsv(headers: string[]): string {
  return headers.filter((h) => h !== "source_image").join(", ");
}

export function toCsv(columns: string[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map(csvEscape).join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(row?.[c])).join(","));
  return [header, ...lines].join("\n");
}

export function downloadTextFile(filename: string, contents: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


