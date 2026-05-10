"use client";

import React, { useState, useRef } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend,
} from "chart.js";
import {
  Upload, Play, Download, RefreshCw, X,
  FileSpreadsheet, CheckCircle, AlertCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Tooltip, Legend
);

const KPI_API_BASE = "https://obeyable-celina-provisorily.ngrok-free.dev";

const CHART_COLORS = [
  "rgba(59,130,246,0.75)",
  "rgba(16,185,129,0.75)",
  "rgba(245,158,11,0.75)",
  "rgba(239,68,68,0.75)",
  "rgba(139,92,246,0.75)",
  "rgba(236,72,153,0.75)",
];
const CHART_BORDERS = [
  "rgb(59,130,246)", "rgb(16,185,129)", "rgb(245,158,11)",
  "rgb(239,68,68)", "rgb(139,92,246)", "rgb(236,72,153)",
];

interface PreviewRow { [key: string]: unknown }
interface UploadResponse {
  job_id: string;
  preview?: { columns: string[]; data: string[][] } | PreviewRow[];
  [key: string]: unknown;
}
interface KpiItem {
  name: string;
  logic: string;
  inputs: string[];
  columns: string[];
  rows: string[][];
}
interface KpiResponse {
  job_id?: string;
  kpis?: KpiItem[];
  [key: string]: unknown;
}

type Step = "idle" | "uploaded" | "done";

export default function KpiUpdates() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFetchingKpis, setIsFetchingKpis] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [kpiResults, setKpiResults] = useState<KpiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiHeaders = { "ngrok-skip-browser-warning": "true" };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch(`${KPI_API_BASE}/api/upload/`, {
        method: "POST", headers: apiHeaders, body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status}): ${res.statusText}`);
      const data: UploadResponse = await res.json();
      setJobId(data.job_id);
      setUploadResponse(data);
      setStep("uploaded");
      setIsUploadModalOpen(false);
      setSelectedFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRun = async () => {
    if (!jobId) return;
    setIsRunning(true); setError(null);
    try {
      const res = await fetch(`${KPI_API_BASE}/api/run/?job_id=${jobId}`, {
        method: "POST", headers: apiHeaders,
      });
      if (!res.ok) throw new Error(`Run failed (${res.status}): ${res.statusText}`);
      await handleGetKpis();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleGetKpis = async () => {
    if (!jobId) return;
    setIsFetchingKpis(true); setError(null);
    try {
      const res = await fetch(`${KPI_API_BASE}/api/kpis/?job_id=${jobId}`, {
        headers: apiHeaders,
      });
      if (!res.ok) throw new Error(`Get KPIs failed (${res.status}): ${res.statusText}`);
      const data: KpiResponse = await res.json();
      setKpiResults(data);
      setCurrentSlide(0);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch KPI results");
    } finally {
      setIsFetchingKpis(false);
    }
  };

  const handleDownload = async () => {
    if (!jobId) return;
    setError(null);
    try {
      const res = await fetch(`${KPI_API_BASE}/api/download/?job_id=${jobId}`, {
        headers: apiHeaders,
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpi_results_${jobId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleReset = () => {
    setStep("idle"); setJobId(null);
    setUploadResponse(null); setKpiResults(null);
    setSelectedFile(null); setError(null); setCurrentSlide(0);
  };

  const getPreview = () => {
    if (!uploadResponse) return null;
    const p = uploadResponse.preview;
    if (!p) return null;
    if (Array.isArray(p) && p.length > 0) {
      const cols = Object.keys(p[0] as object);
      const rows = (p as PreviewRow[]).map(r => cols.map(c => String(r[c] ?? "")));
      return { columns: cols, data: rows };
    }
    if (!Array.isArray(p) && p.columns) return p as { columns: string[]; data: string[][] };
    return null;
  };

  const getKpiItems = (): KpiItem[] => {
    if (!kpiResults) return [];
    if (Array.isArray(kpiResults.kpis)) return kpiResults.kpis;
    const arrayEntry = Object.values(kpiResults).find(
      v => Array.isArray(v) && (v as unknown[]).length > 0 && typeof (v as unknown[])[0] === "object"
    );
    if (arrayEntry) return arrayEntry as KpiItem[];
    if (kpiResults.columns && kpiResults.rows) return [kpiResults as unknown as KpiItem];
    return [];
  };

  const getChartBase = (kpi: KpiItem) => {
    if (!kpi.columns?.length || !kpi.rows?.length) return null;
    if (kpi.columns.length === 1) {
      return {
        labels: kpi.rows.map((_, i) => String(i + 1)),
        valueArrays: [kpi.rows.map(r => parseFloat(r[0]) || 0)],
        colNames: [kpi.columns[0]],
      };
    }
    return {
      labels: kpi.rows.map(r => r[0]),
      valueArrays: kpi.columns.slice(1).map((_, i) => kpi.rows.map(r => parseFloat(r[i + 1]) || 0)),
      colNames: kpi.columns.slice(1),
    };
  };

  const buildBarData = (kpi: KpiItem) => {
    const base = getChartBase(kpi);
    if (!base) return null;
    return {
      labels: base.labels,
      datasets: base.colNames.map((col, i) => ({
        label: col,
        data: base.valueArrays[i],
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderColor: CHART_BORDERS[i % CHART_BORDERS.length],
        borderWidth: 1, borderRadius: 4,
      })),
    };
  };

  const buildLineData = (kpi: KpiItem) => {
    const base = getChartBase(kpi);
    if (!base) return null;
    return {
      labels: base.labels,
      datasets: base.colNames.map((col, i) => ({
        label: col,
        data: base.valueArrays[i],
        borderColor: CHART_BORDERS[i % CHART_BORDERS.length],
        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
        borderWidth: 2, pointRadius: 3, tension: 0.3, fill: false,
      })),
    };
  };

  const buildPieData = (kpi: KpiItem) => {
    const base = getChartBase(kpi);
    if (!base) return null;
    // Pie uses first dataset only, labels = row labels
    return {
      labels: base.labels,
      datasets: [{
        label: base.colNames[0],
        data: base.valueArrays[0],
        backgroundColor: base.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderColor: base.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]),
        borderWidth: 1,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const, labels: { boxWidth: 10, font: { size: 10 } } },
      tooltip: { bodyFont: { size: 11 }, titleFont: { size: 11 } },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { ticks: { font: { size: 10 } } },
    },
  };

  const steps = ["Upload File", "Run Pipeline", "View KPIs"];
  const stepIndex = step === "idle" ? 0 : step === "uploaded" ? 1 : 2;
  const preview = getPreview();
  const kpiItems = getKpiItems();
  const total = kpiItems.length;

  return (
    <div className="p-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-800">KPI Updates</h2>
          <p className="text-xs text-gray-500 mt-0.5">Upload data → run pipeline → view & download KPI results</p>
        </div>
        {step !== "idle" && (
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Step progress */}
      <div className="flex items-center mb-6">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className={`flex-1 h-0.5 mx-2 ${i <= stepIndex ? "bg-blue-400" : "bg-gray-200"}`} />}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
              i === stepIndex ? "bg-blue-600 text-white border-blue-600" :
              i < stepIndex ? "bg-blue-50 text-blue-600 border-blue-200" :
              "bg-gray-50 text-gray-400 border-gray-200"
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                i === stepIndex ? "bg-white text-blue-600" :
                i < stepIndex ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}>{i < stepIndex ? "✓" : i + 1}</span>
              {label}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Step 1: idle */}
      {step === "idle" && (
        <div
          className="border-2 border-dashed border-gray-200 rounded-2xl p-14 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
          onClick={() => setIsUploadModalOpen(true)}
        >
          <FileSpreadsheet className="w-14 h-14 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Upload your CSV or Excel file to begin</p>
          <p className="text-xs text-gray-400 mb-5">Runs schema → profile → plan → code generation</p>
          <button
            onClick={e => { e.stopPropagation(); setIsUploadModalOpen(true); }}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" /> Upload File
          </button>
        </div>
      )}

      {/* Step 2+: uploaded card */}
      {step !== "idle" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700">File Uploaded Successfully</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">Job ID: {jobId}</span>
            </div>
            <button onClick={() => setIsUploadModalOpen(true)} className="text-xs text-blue-600 hover:underline flex-shrink-0">Re-upload</button>
          </div>

          {preview && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Data Preview</p>
              <div className="overflow-auto max-h-40 border border-gray-200 rounded-lg" style={{ scrollbarWidth: "thin", scrollbarColor: "#313b96 #f1f1f1" }}>
                <table className="min-w-full text-xs border-collapse">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>{preview.columns.map(c => <th key={c} className="px-3 py-1.5 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.data?.slice(0, 8).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {row.map((cell, j) => <td key={j} className="px-3 py-1 border-b border-gray-100 text-gray-700 whitespace-nowrap">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "uploaded" && (
            <button
              onClick={handleRun}
              disabled={isRunning || isFetchingKpis}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isRunning || isFetchingKpis
                ? <><RefreshCw className="w-4 h-4 animate-spin" />{isRunning ? "Running Pipeline..." : "Fetching KPIs..."}</>
                : <><Play className="w-4 h-4" /> Run Pipeline</>}
            </button>
          )}
        </div>
      )}

      {/* Step 3: KPI slide view */}
      {step === "done" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Results toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              KPI Results
              {total > 0 && <span className="text-xs text-gray-400 font-normal">({total} KPIs)</span>}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGetKpis}
                disabled={isFetchingKpis}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingKpis ? "animate-spin" : ""}`} /> Refresh
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
              >
                <Download className="w-3 h-3" /> Download .xlsx
              </button>
            </div>
          </div>

          {isFetchingKpis ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" /> Loading KPI results...
            </div>
          ) : total === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">No KPI data returned.</p>
          ) : (
            <>
              {/* Slide header: name + nav */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {kpiItems[currentSlide]?.name?.replace(/_/g, " ")}
                  </p>
                  {kpiItems[currentSlide]?.logic && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{kpiItems[currentSlide].logic}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {/* input tags */}
                  <div className="hidden sm:flex flex-wrap gap-1 max-w-xs">
                    {kpiItems[currentSlide]?.inputs?.map(inp => (
                      <span key={inp} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">{inp}</span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{currentSlide + 1} / {total}</span>
                  <button
                    onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
                    disabled={currentSlide === 0}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentSlide(s => Math.min(total - 1, s + 1))}
                    disabled={currentSlide === total - 1}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Slide body: table on top, 3 charts below */}
              {(() => {
                const kpi = kpiItems[currentSlide];
                const barData  = buildBarData(kpi);
                const lineData = buildLineData(kpi);
                const pieData  = buildPieData(kpi);
                return (
                  <>
                    {/* Data table */}
                    <div className="overflow-auto border-b border-gray-100" style={{ maxHeight: 200, scrollbarWidth: "thin", scrollbarColor: "#313b96 #f1f1f1" }}>
                      <table className="min-w-full text-xs border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-400 border-b border-gray-200 w-8">#</th>
                            {kpi?.columns?.map(c => (
                              <th key={c} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {kpi?.rows?.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"}>
                              <td className="px-3 py-1.5 border-b border-gray-100 text-gray-400 text-[10px]">{i + 1}</td>
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-1.5 border-b border-gray-100 text-gray-700 whitespace-nowrap">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 3 charts row */}
                    <div className="grid grid-cols-3 divide-x divide-gray-100">
                      <div className="p-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-center mb-2">Bar Chart</p>
                        <div style={{ height: 200 }}>
                          {barData
                            ? <Bar data={barData} options={chartOptions} />
                            : <p className="text-xs text-gray-400 text-center pt-10">No data</p>}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-center mb-2">Line Chart</p>
                        <div style={{ height: 200 }}>
                          {lineData
                            ? <Line data={lineData} options={chartOptions} />
                            : <p className="text-xs text-gray-400 text-center pt-10">No data</p>}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-center mb-2">Pie Chart</p>
                        <div style={{ height: 200 }}>
                          {pieData
                            ? <Pie data={pieData} options={{ ...chartOptions, scales: undefined }} />
                            : <p className="text-xs text-gray-400 text-center pt-10">No data</p>}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Dot navigation */}
              <div className="flex items-center justify-center gap-1.5 py-3 border-t border-gray-100 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                {kpiItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`rounded-full transition-all flex-shrink-0 ${
                      i === currentSlide
                        ? "w-5 h-2 bg-blue-600"
                        : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-800">Upload Data File</h3>
                <p className="text-xs text-gray-400 mt-0.5">CSV or Excel files supported</p>
              </div>
              <button onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
              <FileSpreadsheet className={`w-10 h-10 mx-auto mb-2 ${selectedFile ? "text-blue-400" : "text-gray-300"}`} />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-blue-600">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-600">Drag & drop or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Supports .csv, .xlsx, .xls</p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 mb-5 text-xs text-blue-700">
              <span className="mt-0.5 flex-shrink-0">ℹ</span>
              Runs schema → profile → plan → code generation. Returns job_id and a preview of the raw data.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isUploading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading...</>
                  : <><Upload className="w-4 h-4" /> Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
