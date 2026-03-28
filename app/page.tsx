"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, Home, ArrowLeft, Building2, Settings, Play, ClipboardList, DollarSign, Download, FileText } from "lucide-react";
import { AddressInput } from "@/components/upload/address-input";
import { extractFrames, extractThumbnail } from "@/lib/frame-extractor";
import { deduplicateFindings } from "@/lib/deduplication";
import { buildAnalysisResult } from "@/lib/manifest-builder";
import { ProcessingScreen } from "@/components/processing/processing-screen";
import { AnnotatedPlayer } from "@/components/player/annotated-player";
import { RiskScore } from "@/components/report/risk-score";
import { FindingsReport } from "@/components/report/findings-report";
import { CostBreakdown } from "@/components/report/cost-breakdown";
import { NegotiationBrief } from "@/components/report/negotiation-brief";
import { exportReportPDF, exportDamageTablePDF } from "@/lib/pdf-export";
import { AnalysisCard } from "@/components/home/analysis-card";
import { getSavedAnalyses, saveAnalysis, deleteAnalysis } from "@/lib/storage";
import { saveVideo, getVideo, deleteVideo } from "@/lib/video-storage";
import { BATCH_SIZE } from "@/lib/constants";
import type { AppStage, FrameData, Finding, AnalysisResult, SavedAnalysis } from "@/lib/types";

type TabId = "home" | "properties" | "settings";
type ResultsView = "video" | "report" | "costs";

const tabs: { id: TabId; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "properties", icon: Building2, label: "Properties" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const resultsTabs: { id: ResultsView; icon: typeof Play; label: string }[] = [
  { id: "video", icon: Play, label: "Video" },
  { id: "report", icon: ClipboardList, label: "Report" },
  { id: "costs", icon: DollarSign, label: "Costs" },
];

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] as const },
});

/* ─── Reusable sticky shell: header + scrollable body + footer ─── */
function AppShell({
  header,
  footer,
  children,
  bodyScroll = true,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  bodyScroll?: boolean;
}) {
  return (
    <div className="flex flex-col" style={{ height: "100dvh" }}>
      {header && <div className="shrink-0">{header}</div>}
      <div className={`flex-1 min-h-0 ${bodyScroll ? "overflow-y-auto" : "overflow-hidden"}`}>
        {children}
      </div>
      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
}

/* ─── Bottom nav component ─── */
function BottomNav<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { id: T; icon: typeof Home; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav
      className="bg-white border-t border-[var(--color-border)] flex items-center justify-around"
      style={{ height: "56px", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          data-tab={id}
          onClick={() => onChange(id)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
        >
          <Icon
            size={22}
            strokeWidth={active === id ? 2.5 : 1.5}
            className={active === id ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}
          />
          <span
            className={`text-[10px] ${
              active === id ? "text-[var(--color-primary)] font-semibold" : "text-[var(--color-text-muted)]"
            }`}
          >
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}

export default function HomePage() {
  const [stage, setStage] = useState<AppStage>("upload");
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [framesAnalyzed, setFramesAnalyzed] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [liveFindings, setLiveFindings] = useState<Finding[]>([]);
  const [statusText, setStatusText] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [thumbnail, setThumbnail] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [loadedVideoUrl, setLoadedVideoUrl] = useState<string | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [resultsView, setResultsView] = useState<ResultsView>("video");

  useEffect(() => {
    setSavedAnalyses(getSavedAnalyses());
  }, []);

  const videoObjectUrl = useMemo(() => {
    if (videoFile && stage === "results") return URL.createObjectURL(videoFile);
    return null;
  }, [videoFile, stage]);

  const activeVideoSrc = videoObjectUrl || loadedVideoUrl;

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setStage("processing");
    setStatusText("Extracting frames from video...");

    const thumb = await extractThumbnail(videoFile);
    setThumbnail(thumb);

    const frames = await extractFrames(videoFile, (pct) => {
      setProgress(pct * 0.3);
    });
    setTotalFrames(frames.length);
    setStatusText("Analyzing frames with AI vision...");

    const uploadForm = new FormData();
    uploadForm.append("video", videoFile);
    fetch("/api/upload", { method: "POST", body: uploadForm })
      .then((res) => res.json())
      .then((data) => setVideoUrl(data.url))
      .catch(console.error);

    const allFindings: Finding[] = [];
    const batches: FrameData[][] = [];
    for (let i = 0; i < frames.length; i += BATCH_SIZE) {
      batches.push(frames.slice(i, i + BATCH_SIZE));
    }

    let findingCounter = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const res = await fetch("/api/analyze-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames: batch, address }),
        });
        if (!res.ok) {
          if (res.status === 500 && i > 0) {
            setStatusText("Rate limited — waiting to retry...");
            await new Promise((r) => setTimeout(r, 15000));
            const retry = await fetch("/api/analyze-batch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ frames: batch, address }),
            });
            if (retry.ok) {
              const data = await retry.json();
              const uniqueFindings = data.findings.map((f: Finding) => ({
                ...f,
                id: `${f.id}-${findingCounter++}`,
              }));
              allFindings.push(...uniqueFindings);
              setLiveFindings([...allFindings]);
              setStatusText("Analyzing frames with AI vision...");
            }
          }
          continue;
        }
        const data = await res.json();
        const uniqueFindings = data.findings.map((f: Finding) => ({
          ...f,
          id: `${f.id}-${findingCounter++}`,
        }));
        allFindings.push(...uniqueFindings);
        setLiveFindings([...allFindings]);
      } catch (err) {
        console.error(`Batch ${i} error:`, err);
      }
      setFramesAnalyzed(Math.min((i + 1) * BATCH_SIZE, frames.length));
      setProgress(30 + ((i + 1) / batches.length) * 60);
    }

    setStatusText("Building inspection report...");
    setProgress(95);
    const manifest = deduplicateFindings(allFindings);
    const result = buildAnalysisResult(manifest);
    setAnalysisResult(result);
    setProgress(100);
    setStage("results");

    const id = crypto.randomUUID();
    setCurrentAnalysisId(id);
    const savedEntry: SavedAnalysis = {
      id,
      address,
      date: new Date().toISOString(),
      thumbnail: thumb,
      result,
    };
    saveAnalysis(savedEntry);
    saveVideo(id, videoFile).catch(console.error);
    setSavedAnalyses(getSavedAnalyses());
  };

  const handleBack = () => {
    setStage("upload");
    setVideoFile(null);
    setAddress("");
    setAnalysisResult(null);
    setLiveFindings([]);
    setLoadedVideoUrl(null);
    setCurrentAnalysisId(null);
  };

  const handleSelectAnalysis = async (a: SavedAnalysis) => {
    setAnalysisResult(a.result);
    setAddress(a.address);
    setVideoFile(null);
    setCurrentAnalysisId(a.id);
    setStage("results");
    const url = await getVideo(a.id);
    setLoadedVideoUrl(url);
  };

  const handleDeleteAnalysis = (id: string) => {
    deleteAnalysis(id);
    deleteVideo(id).catch(console.error);
    setSavedAnalyses(getSavedAnalyses());
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "video/mp4" || file.type === "video/quicktime" || file.type === "video/webm")) {
      setVideoFile(file);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
  }, []);

  /* ═══════════════════════════════════════════════
     Processing — full-screen, no header/footer
     ═══════════════════════════════════════════════ */
  if (stage === "processing") {
    return (
      <ProcessingScreen
        progress={progress}
        framesAnalyzed={framesAnalyzed}
        totalFrames={totalFrames}
        findings={liveFindings}
        statusText={statusText}
      />
    );
  }

  /* ═══════════════════════════════════════════════
     Results — header + body + results tab footer
     ═══════════════════════════════════════════════ */
  if (stage === "results" && analysisResult) {
    return (
      <AppShell
        bodyScroll={resultsView !== "video"}
        header={
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <button onClick={handleBack} className="p-1 -ml-1 rounded-lg hover:bg-[var(--color-muted)] transition-colors">
              <ArrowLeft size={20} className="text-[var(--color-text-primary)]" />
            </button>
            <span className="text-[var(--color-text-primary)] font-semibold text-sm truncate flex-1">{address}</span>
            <div className="flex gap-1">
              <button
                onClick={() => exportReportPDF(analysisResult, address)}
                className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
                title="Export PDF"
              >
                <FileText size={18} className="text-[var(--color-text-secondary)]" />
              </button>
              <button
                onClick={() => exportDamageTablePDF(analysisResult, address)}
                className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
                title="Download damage report"
              >
                <Download size={18} className="text-[var(--color-text-secondary)]" />
              </button>
            </div>
          </div>
        }
        footer={
          <BottomNav items={resultsTabs} active={resultsView} onChange={setResultsView} />
        }
      >
        {/* Video View */}
        {resultsView === "video" && (
          <div className="h-full">
            {activeVideoSrc ? (
              <AnnotatedPlayer videoSrc={activeVideoSrc} manifest={analysisResult.manifest} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Play size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
                  <p className="text-[var(--color-text-secondary)] text-sm">Loading video...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Report View */}
        {resultsView === "report" && (
          <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            <div className="flex items-center gap-4">
              <RiskScore score={analysisResult.risk_score} />
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {analysisResult.manifest.length} Issues Found
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Risk score: {analysisResult.risk_score}/100
                </p>
              </div>
            </div>
            <div className="border-t border-[var(--color-border)]" />
            <FindingsReport
              manifest={analysisResult.manifest}
              onSeek={() => setResultsView("video")}
            />
          </div>
        )}

        {/* Costs View */}
        {resultsView === "costs" && (
          <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">
            <CostBreakdown
              manifest={analysisResult.manifest}
              totalCostLow={analysisResult.total_cost_low}
              totalCostHigh={analysisResult.total_cost_high}
            />
            <div className="border-t border-[var(--color-border)]" />
            <NegotiationBrief result={analysisResult} address={address} />
          </div>
        )}
      </AppShell>
    );
  }

  /* ═══════════════════════════════════════════════
     Home — header(none) + body + app tab footer
     ═══════════════════════════════════════════════ */
  return (
    <AppShell
      footer={
        <BottomNav items={tabs} active={activeTab} onChange={setActiveTab} />
      }
    >
      {/* ─── Home Tab ─── */}
      {activeTab === "home" && (
        <div className="bg-[var(--color-background)]">
          {/* Hero */}
          <div className="flex flex-col items-center pt-10 pb-4 px-4">
            <motion.div {...fade(0)} className="flex items-center gap-2 mb-5">
              <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                <Home size={14} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[var(--color-text-primary)] font-bold tracking-tight text-lg">HouseScope</span>
            </motion.div>

            <motion.h1
              {...fade(0.1)}
              className="text-center text-2xl sm:text-3xl font-bold tracking-tight leading-tight max-w-md"
            >
              <span className="text-[var(--color-text-primary)]">Know what you&apos;re buying</span>{" "}
              <span className="text-[var(--color-text-secondary)]">before you offer.</span>
            </motion.h1>

            <motion.p
              {...fade(0.15)}
              className="mt-2 text-center text-[var(--color-text-secondary)] text-sm max-w-sm"
            >
              Upload a walkthrough video. AI inspection in 45 seconds.
            </motion.p>
          </div>

          {/* Upload Card */}
          <motion.div {...fade(0.2)} className="mx-auto w-full max-w-md px-4 mb-8">
            <div
              className="bg-white border border-[var(--color-border)] rounded-2xl p-5"
              style={{ boxShadow: "0 2px 8px rgba(120,100,80,0.08), 0 8px 32px rgba(120,100,80,0.06)" }}
            >
              <div
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("video-input")?.click()}
              >
                {!videoFile ? (
                  <>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-primary-bg)] mb-3">
                      <Upload className="h-5 w-5 text-[var(--color-primary)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Drop walkthrough video</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">MP4, MOV, or WebM</p>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-4 py-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="truncate max-w-[180px]">{videoFile.name}</span>
                    <button
                      type="button"
                      className="ml-1 text-green-500 hover:text-green-700 text-xs"
                      onClick={(e) => { e.stopPropagation(); setVideoFile(null); }}
                    >
                      ✕
                    </button>
                  </span>
                )}
                <input
                  id="video-input"
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              <div className="mt-4">
                <AddressInput value={address} onChange={setAddress} />
              </div>

              <button
                className="mt-4 w-full bg-[var(--color-primary)] text-white font-medium rounded-xl py-3 hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
                disabled={!videoFile || !address}
                onClick={handleAnalyze}
              >
                Analyze Property
              </button>
            </div>
          </motion.div>

          {/* Recent analyses */}
          {savedAnalyses.length > 0 && (
            <motion.div {...fade(0.3)} className="mx-auto max-w-md px-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Recent</h2>
                {savedAnalyses.length > 2 && (
                  <button
                    onClick={() => setActiveTab("properties")}
                    className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] font-medium"
                  >
                    View all
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {savedAnalyses.slice(0, 3).map((a) => (
                  <AnalysisCard
                    key={a.id}
                    analysis={a}
                    onSelect={() => handleSelectAnalysis(a)}
                    onDelete={() => handleDeleteAnalysis(a.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ─── Properties Tab ─── */}
      {activeTab === "properties" && (
        <div className="px-4 pt-6 bg-[var(--color-background)]">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Your Properties</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            {savedAnalyses.length} {savedAnalyses.length === 1 ? "analysis" : "analyses"}
          </p>
          {savedAnalyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-full bg-[var(--color-primary-bg)] flex items-center justify-center mb-4">
                <Building2 size={24} className="text-[var(--color-primary)]" />
              </div>
              <p className="text-[var(--color-text-secondary)] font-medium">No properties yet</p>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">Scan a property to see it here</p>
              <button
                onClick={() => setActiveTab("home")}
                className="mt-4 bg-[var(--color-primary)] text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Start Scanning
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
              {savedAnalyses.map((a) => (
                <AnalysisCard
                  key={a.id}
                  analysis={a}
                  onSelect={() => handleSelectAnalysis(a)}
                  onDelete={() => handleDeleteAnalysis(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Settings Tab ─── */}
      {activeTab === "settings" && (
        <div className="px-4 pt-6 bg-[var(--color-background)]">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">Settings</h1>
          <div className="space-y-3">
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">About HouseScope</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">AI-powered home inspection triage</p>
            </div>
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Data Storage</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {savedAnalyses.length} analyses saved locally
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
