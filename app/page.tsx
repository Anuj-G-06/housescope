"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle } from "lucide-react";
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
import { TabBar, type TabId } from "@/components/navigation/tab-bar";
import { HomeView } from "@/components/home/home-view";
import { getSavedAnalyses, saveAnalysis, deleteAnalysis } from "@/lib/storage";
import { BATCH_SIZE } from "@/lib/constants";
import type { AppStage, FrameData, Finding, AnalysisResult, SavedAnalysis } from "@/lib/types";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] as const },
});

export default function Home() {
  const [stage, setStage] = useState<AppStage>("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [framesAnalyzed, setFramesAnalyzed] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [liveFindings, setLiveFindings] = useState<Finding[]>([]);
  const [statusText, setStatusText] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [thumbnail, setThumbnail] = useState<string>("");

  useEffect(() => {
    setSavedAnalyses(getSavedAnalyses());
  }, []);

  const videoObjectUrl = useMemo(() => {
    if (videoFile && stage === "results") return URL.createObjectURL(videoFile);
    return null;
  }, [videoFile, stage]);

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setStage("processing");
    setStatusText("Extracting frames from video...");

    // Extract thumbnail before frames
    const thumb = await extractThumbnail(videoFile);
    setThumbnail(thumb);

    // Step 1: Extract frames
    const frames = await extractFrames(videoFile, (pct) => {
      setProgress(pct * 0.3); // 0-30% for extraction
    });
    setTotalFrames(frames.length);
    setStatusText("Analyzing frames with AI vision...");

    // Step 2: Upload video to Blob (fire and forget)
    const uploadForm = new FormData();
    uploadForm.append("video", videoFile);
    fetch("/api/upload", { method: "POST", body: uploadForm })
      .then((res) => res.json())
      .then((data) => setVideoUrl(data.url))
      .catch(console.error);

    // Step 3: Send batches to analysis API
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
          // Rate limited — wait and retry once
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
        // Ensure unique IDs across batches
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
      setProgress(30 + ((i + 1) / batches.length) * 60); // 30-90%
    }

    // Step 4: Deduplicate and build result
    setStatusText("Building inspection report...");
    setProgress(95);
    const manifest = deduplicateFindings(allFindings);
    const result = buildAnalysisResult(manifest);
    setAnalysisResult(result);
    setProgress(100);
    setStage("results");

    // Save to localStorage
    const savedEntry: SavedAnalysis = {
      id: crypto.randomUUID(),
      address,
      date: new Date().toISOString(),
      thumbnail: thumb,
      result,
    };
    saveAnalysis(savedEntry);
    setSavedAnalyses(getSavedAnalyses());
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type === "video/mp4" || file.type === "video/quicktime" || file.type === "video/webm")) {
        setVideoFile(file);
      }
    },
    []
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setVideoFile(file);
    },
    []
  );

  const handleTabChange = (tab: TabId) => {
    if (tab === "scan" && activeTab === "scan" && stage !== "upload") {
      // Reset for new scan if tapping scan again
      setStage("upload");
      setVideoFile(null);
      setAddress("");
      setAnalysisResult(null);
      setLiveFindings([]);
    }
    setActiveTab(tab);
  };

  const handleSelectAnalysis = (a: SavedAnalysis) => {
    setAnalysisResult(a.result);
    setAddress(a.address);
    setVideoFile(null);
    setStage("results");
    setActiveTab("scan");
  };

  const handleDeleteAnalysis = (id: string) => {
    deleteAnalysis(id);
    setSavedAnalyses(getSavedAnalyses());
  };

  return (
    <main className="min-h-screen bg-[var(--color-background)] pb-16">
      {activeTab === "home" && (
        <HomeView
          analyses={savedAnalyses}
          onSelectAnalysis={handleSelectAnalysis}
          onDeleteAnalysis={handleDeleteAnalysis}
          onStartScan={() => { setActiveTab("scan"); setStage("upload"); }}
        />
      )}

      {activeTab === "scan" && (
        <>
          {/* Minimal top bar for scan tab */}
          {stage !== "processing" && (
            <div className="sticky top-0 z-40 flex items-center px-4 py-3 bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-primary)] font-semibold">
                {stage === "upload" ? "New Scan" : address}
              </span>
            </div>
          )}

          {stage === "upload" && (
            <div className="flex flex-col items-center pt-8 pb-16 px-4">
              <motion.span
                {...fade(0)}
                className="inline-flex items-center gap-1.5 border border-[var(--color-primary)]/40 bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)] text-xs font-medium rounded-full px-3 py-1"
              >
                🏠 AI-Powered Home Inspection
              </motion.span>

              <motion.h1
                {...fade(0.1)}
                className="mt-6 text-center text-4xl sm:text-5xl font-bold tracking-tight leading-tight max-w-2xl"
              >
                <span className="text-[var(--color-text-primary)]">Know exactly what you&apos;re buying</span>{" "}
                <span className="text-[var(--color-text-secondary)]">before you make an offer.</span>
              </motion.h1>

              <motion.p
                {...fade(0.2)}
                className="mt-4 text-center text-[var(--color-text-secondary)] text-lg max-w-xl"
              >
                Upload a walkthrough video and get an AI-powered inspection report in 45 seconds — spot issues, estimate repairs, and negotiate with confidence.
              </motion.p>

              <motion.div
                {...fade(0.3)}
                className="mt-6 flex flex-wrap justify-center gap-3"
              >
                {[
                  "25% of buyers waive inspections",
                  "$14K avg negotiation savings",
                  "$3B+ market",
                ].map((stat) => (
                  <span
                    key={stat}
                    className="text-xs font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-full px-3 py-1 bg-white"
                  >
                    {stat}
                  </span>
                ))}
              </motion.div>

              <motion.div
                {...fade(0.4)}
                className="mt-12 w-full max-w-xl bg-white border border-[var(--color-border)] rounded-2xl p-8"
                style={{ boxShadow: '0 2px 8px rgba(120,100,80,0.08), 0 8px 32px rgba(120,100,80,0.06)' }}
              >
                {/* Drop zone */}
                <div
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
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
                      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-primary-bg)] mb-4">
                        <Upload className="h-5 w-5 text-[var(--color-primary)]" />
                      </div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        Drop your walkthrough video here
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        MP4 or MOV, up to 3 minutes
                      </p>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-4 py-2">
                      <CheckCircle className="h-4 w-4" />
                      {videoFile.name}
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

                {/* Address input */}
                <div className="mt-6">
                  <AddressInput value={address} onChange={setAddress} />
                </div>

                {/* Submit button */}
                <button
                  className="mt-6 w-full bg-[var(--color-primary)] text-white font-medium rounded-xl py-3 hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
                  disabled={!videoFile || !address}
                  onClick={handleAnalyze}
                >
                  Analyze Property
                </button>
              </motion.div>
            </div>
          )}

          {stage === "processing" && (
            <ProcessingScreen
              progress={progress}
              framesAnalyzed={framesAnalyzed}
              totalFrames={totalFrames}
              findings={liveFindings}
              statusText={statusText}
            />
          )}

          {stage === "results" && analysisResult && (
            <div className="mx-auto max-w-5xl px-4 pt-6 pb-16 space-y-10">
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Inspection Results</h2>
                <p className="text-[var(--color-text-secondary)]">{address}</p>
              </div>

              {videoFile && videoObjectUrl && (
                <AnnotatedPlayer
                  videoSrc={videoObjectUrl}
                  manifest={analysisResult.manifest}
                />
              )}
              {!videoFile && (
                <div className="bg-[var(--color-muted)] rounded-xl p-8 text-center">
                  <p className="text-[var(--color-text-secondary)] text-sm">Video not available for past analyses</p>
                  <p className="text-[var(--color-text-muted)] text-xs mt-1">Upload the video again to view annotated playback</p>
                </div>
              )}

              <div className="border-t border-[var(--color-border)]" />

              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
                <RiskScore score={analysisResult.risk_score} />
                <CostBreakdown
                  manifest={analysisResult.manifest}
                  totalCostLow={analysisResult.total_cost_low}
                  totalCostHigh={analysisResult.total_cost_high}
                />
              </div>

              <div className="border-t border-[var(--color-border)]" />

              <FindingsReport
                manifest={analysisResult.manifest}
                onSeek={(t) => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />

              <div className="border-t border-[var(--color-border)]" />

              <NegotiationBrief result={analysisResult} address={address} />

              <div className="border-t border-[var(--color-border)]" />

              <div className="flex gap-3 justify-center pb-12">
                <button
                  className="bg-white border border-[var(--color-border)] rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-primary-bg)] transition-colors text-[var(--color-text-primary)]"
                  onClick={() => exportReportPDF(analysisResult, address)}
                >
                  Export PDF Report
                </button>
                <button
                  className="bg-white border border-[var(--color-border)] rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-primary-bg)] transition-colors text-[var(--color-text-primary)]"
                  onClick={() => exportDamageTablePDF(analysisResult, address)}
                >
                  Download Damage Report
                </button>
                {videoUrl && (
                  <button
                    className="bg-white border border-[var(--color-border)] rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-primary-bg)] transition-colors text-[var(--color-text-primary)]"
                    onClick={() => navigator.clipboard.writeText(videoUrl)}
                  >
                    Copy Shareable Video Link
                  </button>
                )}
                <button
                  className="rounded-xl px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-bg)] transition-colors"
                  onClick={() => {
                    setStage("upload");
                    setVideoFile(null);
                    setAddress("");
                    setAnalysisResult(null);
                    setLiveFindings([]);
                  }}
                >
                  Analyze Another Property
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "settings" && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--color-text-muted)]">
          <p className="text-sm">Settings coming soon</p>
        </div>
      )}

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
    </main>
  );
}
