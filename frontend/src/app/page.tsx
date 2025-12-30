"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { extractOneImage, getApiConfig, Provider, ApiConfig } from "@/lib/api";
import { downloadTextFile, toCsv, parseCsvFile, headersToFieldsCsv } from "@/lib/csv";
import {
  loadApiKey,
  saveApiKey,
  clearApiKey,
  loadProvider,
  saveProvider,
  loadRows,
  saveRows,
  loadColumns,
  saveColumns,
  loadKeyMap,
  saveKeyMap,
  loadErrors,
  saveErrors,
  clearAllExtractionData,
} from "@/lib/storage";

// Icons as inline SVGs
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const CogIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const RocketIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const TableIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// 3-step flow: Upload → Configure → Extract
type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1 as Step, label: "Upload", icon: ImageIcon },
  { id: 2 as Step, label: "Configure", icon: CogIcon },
  { id: 3 as Step, label: "Extract", icon: RocketIcon },
];

// Gemini icon
const GeminiIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
);

// OpenAI icon
const OpenAIIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
  </svg>
);

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [prompt, setPrompt] = useState(
    "Extract the requested fields from the screenshot. If a field is missing or unreadable, return null."
  );
  const [fields, setFields] = useState("item, amount, date");
  const [detail, setDetail] = useState<"auto" | "low" | "high">("auto");
  const [files, setFiles] = useState<File[]>([]);

  // Provider state - OpenAI is default
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(null);
  const [model, setModel] = useState("gpt-4o-mini");

  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [errors, setErrors] = useState<Array<{ source_image: string; error: string }>>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [keyMap, setKeyMap] = useState<Record<string, string>>({});
  const [showSourceImage, setShowSourceImage] = useState(true);
  const [formError, setFormError] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImportedRows, setCsvImportedRows] = useState<Array<Record<string, unknown>>>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Load saved provider first
    const savedProvider = loadProvider();
    setProvider(savedProvider);
    
    // Load API key for saved provider
    setApiKey(loadApiKey(savedProvider));
    
    setRows(loadRows());
    setColumns(loadColumns());
    setKeyMap(loadKeyMap());
    setErrors(loadErrors());
    
    // Fetch API config
    getApiConfig().then((config) => {
      setApiConfig(config);
      setModel(savedProvider === "openai" ? config.default_openai_model : config.default_gemini_model);
    });
  }, []);
  
  // Update model and load API key when provider changes
  function onProviderChange(newProvider: Provider) {
    setProvider(newProvider);
    saveProvider(newProvider);
    
    // Load the API key for the new provider
    setApiKey(loadApiKey(newProvider));
    
    if (apiConfig) {
      setModel(newProvider === "gemini" ? apiConfig.default_gemini_model : apiConfig.default_openai_model);
    }
  }

  const fieldsPreview = useMemo(() => {
    return fields
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [fields]);

  const previewColumns = useMemo(() => {
    const base = columns.length ? columns : [];
    return showSourceImage ? ["source_image", ...base] : base;
  }, [columns, showSourceImage]);

  const previewRows = useMemo(() => rows.slice(0, 50), [rows]);

  function onFilesSelected(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected);
    setFiles(next.slice(0, 50));
  }

  const canRun = useMemo(() => {
    // Both providers require API key (BYOK)
    const hasRequiredKey = apiKey.trim().length > 0;
    return hasRequiredKey && files.length > 0 && fieldsPreview.length > 0 && !isRunning;
  }, [apiKey, files.length, fieldsPreview.length, isRunning]);

  const progressPct = useMemo(() => {
    if (!files.length) return 0;
    return Math.max(0, Math.min(100, Math.round((done / files.length) * 100)));
  }, [done, files.length]);

  async function onRun() {
    const trimmedKey = apiKey.trim();
    
    // Both providers require API key (BYOK)
    if (!trimmedKey) {
      setShowApiKeyModal(true);
      return;
    }
    
    if (!files.length) {
      setFormError("Please upload at least one image.");
      return;
    }
    if (files.length > 50) {
      setFormError("Max 50 images per run.");
      return;
    }
    if (!fieldsPreview.length) {
      setFormError("Please provide at least one field (comma-separated).");
      return;
    }

    if (columns.length) {
      const oldColsSet = new Set(columns);
      const newCols = fieldsPreview.map((f) =>
        f
          .trim()
          .toLowerCase()
          .replace(/[^\w]+/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "") || "field"
      );
      const mismatch = newCols.some((c) => !oldColsSet.has(c)) || newCols.length !== columns.length;
      if (mismatch) {
        setFormError(
          "You changed fields since the last extraction. Click \"Clear all results\" first to start fresh, or restore the previous fields."
        );
        return;
      }
    }

    // Save API key for current provider
    if (trimmedKey) {
      saveApiKey(provider, trimmedKey);
    }
    
    setIsRunning(true);
    setDone(0);
    setCurrentFile("");
    setFormError("");

    const existingCols = columns;
    // Start with existing rows + any CSV imported rows that haven't been added yet
    const startingRows = [...rows, ...csvImportedRows];
    const aggRows: Array<Record<string, unknown>> = [...startingRows];
    const aggErrors: Array<{ source_image: string; error: string }> = [...errors];
    let aggColumns: string[] = existingCols.length ? existingCols : [];
    let aggKeyMap: Record<string, string> = Object.keys(keyMap).length ? keyMap : {};

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setCurrentFile(f.name);
        try {
          const resp = await extractOneImage({
            file: f,
            prompt,
            fields,
            provider,
            model,
            detail,
            apiKey: trimmedKey,
          });

          if (!aggColumns.length && resp.columns?.length) aggColumns = resp.columns;
          if (!Object.keys(aggKeyMap).length && resp.key_map) aggKeyMap = resp.key_map;

          if (Array.isArray(resp.rows)) aggRows.push(...resp.rows);
          if (Array.isArray(resp.errors) && resp.errors.length) aggErrors.push(...resp.errors);
        } catch (e) {
          // Backend now returns user-friendly error messages
          const errorMsg = e instanceof Error ? e.message : String(e);
          aggErrors.push({
            source_image: f.name,
            error: errorMsg,
          });
        } finally {
          setDone(i + 1);
        }
      }
    } finally {
      setRows(aggRows);
      setErrors(aggErrors);
      setColumns(aggColumns);
      setKeyMap(aggKeyMap);
      saveRows(aggRows);
      saveErrors(aggErrors);
      saveColumns(aggColumns);
      saveKeyMap(aggKeyMap);
      setIsRunning(false);
      setFiles([]);
      // Clear CSV imported rows since they've been merged into main rows
      setCsvImportedRows([]);
    }
  }

  function onClearAllResults() {
    clearAllExtractionData();
    setRows([]);
    setErrors([]);
    setColumns([]);
    setKeyMap({});
    clearCsvImport();
  }

  function downloadCsv(withSource: boolean) {
    const baseCols = columns.length ? columns : [];
    const cols = withSource ? ["source_image", ...baseCols] : baseCols;
    const csv = toCsv(cols, rows);
    downloadTextFile(withSource ? "extracted_with_source.csv" : "extracted.csv", csv);
  }

  function clearKey() {
    clearApiKey(provider);
    setApiKey("");
  }

  function saveKey() {
    if (apiKey.trim()) {
      saveApiKey(provider, apiKey.trim());
      setShowApiKeyModal(false);
    }
  }

  function applyPreset(preset: "invoice" | "wildlife" | "generic") {
    if (preset === "invoice") {
      setPrompt(
        "Extract invoice line items. If a field is missing or unreadable, return null. If there are multiple line items, return multiple rows."
      );
      setFields("item_description, hsn, quantity, item_rate, discount, tax, amount");
      return;
    }
    if (preset === "wildlife") {
      setPrompt(
        "Extract one row per event/record shown in the screenshot(s). If a field is missing or unreadable, return null. Do not guess."
      );
      setFields(
        "Tag Number, Length (cm), Weight (kg), Event Type, Tagger, Date, Time, GPS/Location, Water Temperature (°C)"
      );
      return;
    }
    setPrompt("Extract the requested fields from the screenshot. If a field is missing or unreadable, return null.");
    setFields("item, amount, date");
  }

  function onDropFiles(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      onFilesSelected(e.dataTransfer.files);
    }
  }

  async function onCsvSelected(file: File | null) {
    if (!file) return;
    setFormError("");

    try {
      const { headers, rows: csvRows } = await parseCsvFile(file);
      const dataHeaders = headers.filter((h) => h !== "source_image");

      if (!dataHeaders.length) {
        setFormError("CSV has no valid data columns (excluding source_image).");
        return;
      }

      if (columns.length) {
        const mismatch =
          dataHeaders.length !== columns.length ||
          dataHeaders.some((h) => !columns.includes(h));
        if (mismatch) {
          setFormError(
            "CSV columns don't match current session. Click \"Clear all results\" first, then upload CSV."
          );
          return;
        }
      }

      const fieldsCsv = headersToFieldsCsv(headers);
      setFields(fieldsCsv);
      setColumns(dataHeaders);
      // Store CSV rows separately - don't show them as "extracted" yet
      setCsvImportedRows(csvRows);
      setCsvFile(file);

      const importedKeyMap: Record<string, string> = {};
      dataHeaders.forEach((h) => {
        importedKeyMap[h] = h;
      });
      setKeyMap(importedKeyMap);

      // Only save columns and keyMap, NOT rows - rows will be added after extraction
      saveColumns(dataHeaders);
      saveKeyMap(importedKeyMap);
    } catch (e) {
      setFormError(`Failed to parse CSV: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function clearCsvImport() {
    setCsvFile(null);
    setCsvImportedRows([]);
  }

  function goToStep(step: Step) {
    setCurrentStep(step);
  }

  function nextStep() {
    if (currentStep < 3) setCurrentStep((currentStep + 1) as Step);
  }

  function prevStep() {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as Step);
  }

  function isStepComplete(step: Step): boolean {
    switch (step) {
      case 1: return files.length > 0;
      case 2: return fieldsPreview.length > 0;
      case 3: return rows.length > 0;
      default: return false;
    }
  }

  const hasApiKey = apiKey.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--surface-base)] bg-grid">
      {/* Glow effect */}
      <div className="fixed inset-0 bg-glow pointer-events-none" />

      {/* API Key Modal - Provider aware */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card p-8 max-w-md w-full mx-4 animate-scale-in">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                provider === "openai" 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500" 
                  : "bg-gradient-to-br from-blue-500 to-purple-500"
              }`}>
                <KeyIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {provider === "openai" ? "OpenAI" : "Gemini"} API Key
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">Required to use {provider === "openai" ? "OpenAI" : "Gemini"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                className="input w-full font-mono text-sm"
                placeholder={provider === "openai" ? "sk-... (paste your OpenAI API key)" : "AI... (paste your Gemini API key)"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                autoComplete="off"
                autoFocus
              />

              <div className="text-xs text-[var(--text-muted)] bg-[var(--surface-elevated)] rounded-xl p-4">
                <strong className="text-[var(--text-secondary)]">🔒 Privacy:</strong> Your key is stored only in your browser and sent directly to {provider === "openai" ? "OpenAI" : "Google"}. We never see or store it.
                <br /><br />
                <strong className="text-[var(--text-secondary)]">💡 Get a key:</strong>{" "}
                {provider === "openai" ? (
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--brand-accent)] hover:underline"
                  >
                    platform.openai.com/api-keys
                  </a>
                ) : (
                  <a 
                    href="https://aistudio.google.com/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--brand-accent)] hover:underline"
                  >
                    aistudio.google.com/apikey
                  </a>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                className="btn btn-ghost flex-1"
                onClick={() => setShowApiKeyModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary flex-1"
                onClick={saveKey}
                disabled={!apiKey.trim()}
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-8">
        {/* Header with Provider Toggle */}
        <header className="text-center mb-8 animate-slide-down">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-accent)] to-[var(--brand-tertiary)] flex items-center justify-center">
                <TableIcon />
              </div>
              <span className="text-2xl font-bold text-gradient">DataForge</span>
            </div>
            
            {/* Provider Toggle & API Key */}
            <div className="flex items-center gap-3">
              {/* Provider Toggle - OpenAI first */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-muted)]">
                <button
                  onClick={() => onProviderChange("openai")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    provider === "openai"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <OpenAIIcon />
                  <span className="hidden sm:inline">OpenAI</span>
                </button>
                <button
                  onClick={() => onProviderChange("gemini")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    provider === "gemini"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <GeminiIcon />
                  <span className="hidden sm:inline">Gemini</span>
                </button>
              </div>
              
              {/* API Key Button - Show for both providers (BYOK) */}
              <button
                onClick={() => setShowApiKeyModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  hasApiKey 
                    ? 'bg-[var(--success-muted)] border border-[var(--success)] text-[var(--success)] hover:bg-[var(--success)]/20' 
                    : 'bg-[var(--warning-muted)] border border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning)]/20'
                }`}
              >
                <KeyIcon />
                {hasApiKey ? '✓ Key Set' : 'Set Key'}
              </button>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3">
            Screenshot → Structured Data
          </h1>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            Transform screenshots into clean, structured CSV data using AI vision.
          </p>
          
          <div className="flex justify-center gap-3 mt-4">
            <span className="badge badge-default">🔐 BYOK</span>
            <span className="badge badge-default">🚀 50 images/batch</span>
            <span className="badge badge-default">💾 Local storage</span>
          </div>
        </header>

        {/* Stepper - 3 steps */}
        <div className="card p-2 mb-8 animate-slide-up">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => goToStep(step.id)}
                  className={`step flex-1 rounded-xl ${currentStep === step.id ? 'active' : ''} ${isStepComplete(step.id) ? 'completed' : ''}`}
                >
                  <div className="step-number">
                    {isStepComplete(step.id) && currentStep !== step.id ? (
                      <CheckIcon />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="step-label hidden sm:block">{step.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`step-connector ${isStepComplete(step.id) ? 'completed' : ''}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {formError && (
          <div className="card mb-6 p-4 border-[var(--error)] bg-[var(--error-muted)] animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="text-[var(--error)]">⚠️</div>
              <div className="flex-1 text-sm text-[var(--error)]">{formError}</div>
              <button onClick={() => setFormError("")} className="text-[var(--error)] hover:opacity-70">
                <XIcon />
              </button>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="animate-scale-in">
          {/* Step 1: Upload Images */}
          {currentStep === 1 && (
            <div className="card p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-accent)] flex items-center justify-center text-white">
                  <ImageIcon />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Upload Screenshots</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Select the images you want to extract data from
                  </p>
                </div>
                {files.length > 0 && (
                  <span className="badge badge-success ml-auto">{files.length} selected</span>
                )}
              </div>

              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                multiple
                onChange={(e) => onFilesSelected(e.target.files)}
              />

              <div
                className={`dropzone ${dragActive ? 'active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                onDrop={onDropFiles}
              >
                <UploadIcon />
                <div className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  Drop images here, or click to browse
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  PNG, JPEG, WEBP, GIF • Up to 50 images per batch
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-muted)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {files.length} screenshot(s) ready to process
                    </span>
                    <button 
                      className="text-xs text-[var(--error)] hover:underline"
                      onClick={() => setFiles([])}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-32 overflow-auto space-y-1 font-mono text-xs text-[var(--text-muted)]">
                    {files.map((f) => (
                      <div key={`${f.name}-${f.size}`} className="truncate">
                        {f.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional: Continue from previous session */}
              <div className="mt-6 pt-6 border-t border-[var(--border-muted)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Continue from previous session?</span>
                  {csvFile && (
                    <span className="badge badge-success text-xs">{csvImportedRows.length} rows loaded</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Import an existing CSV to append new extractions to it. Your new screenshots will be processed and added to the imported data.
                </p>
                <input
                  ref={csvInputRef}
                  className="hidden"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => onCsvSelected(e.target.files?.[0] || null)}
                />
                <button 
                  className="btn btn-ghost w-full text-sm"
                  onClick={() => csvInputRef.current?.click()}
                >
                  {csvFile ? `📄 ${csvFile.name} (${csvImportedRows.length} rows)` : "📄 Import CSV to append..."}
                </button>
              </div>

              <div className="flex justify-end mt-8">
                <button 
                  className="btn btn-primary"
                  onClick={nextStep}
                  disabled={files.length === 0}
                >
                  Continue to Configure →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure Extraction */}
          {currentStep === 2 && (
            <div className="card p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-tertiary)] to-[var(--brand-accent)] flex items-center justify-center text-white">
                  <CogIcon />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">Configure Extraction</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Define what data to extract from your screenshots
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-sm text-[var(--text-muted)]">Quick presets:</span>
                <button 
                  className="badge badge-accent cursor-pointer hover:opacity-80"
                  onClick={() => applyPreset("invoice")}
                >
                  📄 Invoice
                </button>
                <button 
                  className="badge badge-accent cursor-pointer hover:opacity-80"
                  onClick={() => applyPreset("wildlife")}
                >
                  🐟 Field Record
                </button>
                <button 
                  className="badge badge-default cursor-pointer hover:opacity-80"
                  onClick={() => applyPreset("generic")}
                >
                  ↺ Reset
                </button>
              </div>

              <div className="space-y-6">
                {/* Prompt */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Extraction Prompt
                  </label>
                  <textarea
                    className="input w-full min-h-[120px] resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how to extract data from the images..."
                  />
                </div>

                {/* Fields */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Fields to Extract <span className="text-[var(--text-muted)]">(comma-separated)</span>
                  </label>
                  <input
                    className="input w-full font-mono"
                    value={fields}
                    onChange={(e) => setFields(e.target.value)}
                    placeholder="item, amount, date, ..."
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {fieldsPreview.map((f) => (
                      <span key={f} className="badge badge-default font-mono text-xs">
                        {f}
                      </span>
                    ))}
                    {!fieldsPreview.length && (
                      <span className="text-xs text-[var(--warning)]">Add at least one field</span>
                    )}
                  </div>
                </div>

                {/* Advanced Options */}
                <div className={`grid gap-4 ${provider === "openai" ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Model
                    </label>
                    {provider === "gemini" ? (
                      <div className="input w-full font-mono text-sm bg-[var(--surface-elevated)] text-[var(--text-muted)] cursor-not-allowed">
                        {model}
                        <span className="text-xs text-[var(--text-muted)] ml-2">(fixed)</span>
                      </div>
                    ) : (
                      <input
                        className="input w-full font-mono text-sm"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                      />
                    )}
                  </div>
                  {/* Image Detail - Only for OpenAI */}
                  {provider === "openai" && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Image Detail
                      </label>
                      <select
                        className="input w-full"
                        value={detail}
                        onChange={(e) => setDetail(e.target.value as "auto" | "low" | "high")}
                      >
                        <option value="auto">Auto</option>
                        <option value="low">Low (faster)</option>
                        <option value="high">High (better)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button className="btn btn-ghost" onClick={prevStep}>
                  ← Back
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={nextStep}
                  disabled={fieldsPreview.length === 0}
                >
                  Continue to Extract →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Run Extraction */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Run Card */}
              <div className="card p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${
                    provider === "gemini" 
                      ? "bg-gradient-to-br from-blue-500 to-purple-500"
                      : "bg-gradient-to-br from-emerald-500 to-teal-500"
                  }`}>
                    <RocketIcon />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Ready to Extract</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {files.length} image(s) • {fieldsPreview.length} field(s) • 
                      <span className={provider === "gemini" ? "text-blue-400" : "text-emerald-400"}> {model}</span>
                    </p>
                  </div>
                  <button
                    className="btn btn-primary text-lg px-8"
                    onClick={onRun}
                    disabled={!canRun}
                  >
                    {isRunning ? "Extracting..." : "🚀 Start Extraction"}
                  </button>
                </div>

                {/* API Key Warning - show if no key set */}
                {!hasApiKey && (
                  <div 
                    className="mt-4 p-4 rounded-xl bg-[var(--warning-muted)] border border-[var(--warning)] cursor-pointer hover:bg-[var(--warning)]/20 transition-colors"
                    onClick={() => setShowApiKeyModal(true)}
                  >
                    <div className="flex items-center gap-3">
                      <KeyIcon />
                      <div>
                        <div className="text-sm font-medium text-[var(--warning)]">
                          {provider === "openai" ? "OpenAI" : "Gemini"} API Key Required
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Click here to enter your {provider === "openai" ? "OpenAI" : "Gemini"} API key before extracting
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress */}
                {isRunning && (
                  <div className="mt-6 p-6 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-muted)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-[var(--text-primary)] font-medium">
                        Processing: <span className="font-mono text-[var(--brand-accent)]">{currentFile || "..."}</span>
                      </span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {done} / {files.length} ({progressPct}%)
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                )}

                {/* Summary when done */}
                {!isRunning && rows.length > 0 && (
                  <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-[var(--success-muted)] border border-[var(--success)]">
                    <div className="text-[var(--success)]">
                      ✅ Total <strong>{rows.length}</strong> row(s)
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv(false)}>
                        <DownloadIcon /> CSV
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadCsv(true)}>
                        <DownloadIcon /> CSV + Source
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Results Preview */}
              {rows.length > 0 && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <TableIcon /> Preview
                    </h3>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSourceImage}
                          onChange={(e) => setShowSourceImage(e.target.checked)}
                          className="rounded"
                        />
                        Show source_image
                      </label>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={onClearAllResults}
                        disabled={!rows.length && !errors.length}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="overflow-auto rounded-xl border border-[var(--border-default)]">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {previewColumns.map((c) => (
                            <th key={c}>
                              {c}
                              {c !== "source_image" && keyMap[c] && (
                                <div className="text-[10px] text-[var(--text-muted)] font-normal normal-case">{keyMap[c]}</div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r, idx) => (
                          <tr key={idx}>
                            {previewColumns.map((c) => (
                              <td key={c}>
                                {r?.[c] === null || r?.[c] === undefined ? (
                                  <span className="text-[var(--text-muted)]">—</span>
                                ) : (
                                  String(r?.[c])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {rows.length > 50 && (
                    <div className="text-center text-sm text-[var(--text-muted)] mt-4">
                      Showing first 50 of {rows.length} rows. Download CSV for complete data.
                    </div>
                  )}
                </div>
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <div className="card p-6 border-[var(--warning)]">
                  <h3 className="text-lg font-semibold text-[var(--warning)] mb-4">
                    ⚠️ Errors ({errors.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {errors.slice(0, 20).map((e, i) => (
                      <div key={i} className="text-sm text-[var(--text-secondary)] font-mono">
                        <span className="text-[var(--warning)]">{e.source_image}:</span> {e.error}
                      </div>
                    ))}
                    {errors.length > 20 && (
                      <div className="text-sm text-[var(--text-muted)]">
                        ...and {errors.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No data yet */}
              {!rows.length && !isRunning && (
                <div className="card p-12 text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    No data yet
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    {hasApiKey 
                      ? 'Click "Start Extraction" to process your images' 
                      : `Set your ${provider === "openai" ? "OpenAI" : "Gemini"} API key, then click "Start Extraction"`}
                  </p>
                </div>
              )}

              <div className="flex justify-start">
                <button className="btn btn-ghost" onClick={prevStep}>
                  ← Back to Configure
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-[var(--text-muted)]">
          <p>Built with ❤️ using Next.js, Gemini & OpenAI Vision APIs</p>
        </footer>
      </div>
    </div>
  );
}
