export type Provider = "openai" | "gemini";

export type ExtractResponse = {
  columns: string[];
  key_map: Record<string, string>;
  rows: Array<Record<string, unknown>>; // includes source_image
  errors: Array<{ source_image: string; error: string }>;
  provider?: string;
};

export type ApiConfig = {
  default_provider: Provider;
  default_gemini_model: string;
  default_openai_model: string;
};

export function getBackendUrl(): string {
  // Client-side use only. Default to local dev.
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
}

export async function getApiConfig(): Promise<ApiConfig> {
  const res = await fetch(`${getBackendUrl()}/api/config`);
  if (!res.ok) {
    // Fallback if config endpoint fails
    return {
      default_provider: "openai",
      default_gemini_model: "gemini-2.0-flash",
      default_openai_model: "gpt-4o-mini",
    };
  }
  return (await res.json()) as ApiConfig;
}

export async function extractOneImage(params: {
  file: File;
  prompt: string;
  fields: string;
  provider: Provider;
  model: string;
  detail: "auto" | "low" | "high";
  apiKey: string; // Required for both providers (BYOK)
}): Promise<ExtractResponse> {
  const { file, prompt, fields, provider, model, detail, apiKey } = params;
  const form = new FormData();
  form.append("images", file);
  form.append("prompt", prompt);
  form.append("fields", fields);
  form.append("provider", provider);
  form.append("model", model);
  form.append("detail", detail);

  const headers: Record<string, string> = {};
  
  // Add API key header for both providers (BYOK)
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetch(`${getBackendUrl()}/api/extract`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend error (${res.status}): ${text || res.statusText}`);
  }

  return (await res.json()) as ExtractResponse;
}
