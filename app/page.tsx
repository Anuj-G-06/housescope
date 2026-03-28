"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, Home, ArrowLeft } from "lucide-react";
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
import { BATCH_SIZE } from "@/lib/constants";
import type { AppStage, FrameData, Finding, AnalysisResult, SavedAnalysis } from "@/lib/types";

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] as const },
});

export default function HomePage() {
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
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [thumbnail, setThumbnail] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

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

  const handleBack = () => {
    setStage("upload");
    setVideoFile(null);
    setAddress("");
    setAnalysisResult(null);
    setLiveFindings([]);
  };

  const handleSelectAnalysis = (a: SavedAnalysis) => {
    setAnalysisResult(a.result);
    setAddress(a.address);
    setVideoFile(null);
    setStage("results");
  };

  const handleDeleteAnalysis = (id: string) => {
    deleteAnalysis(id);
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

  /* ─── Processing: full-screen takeover ─── */
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

  /* ─── Results: full-screen with back button ─── */
  if (stage === "results" && analysisResult) {
    return (
      <main className="min-h-screen bg-[var(--color-background)]">
        {/* Back header */}
        <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
          <button onClick={handleBack} className="p-1 -ml-1 rounded-lg hover:bg-[var(--color-muted)] transition-colors">
            <ArrowLeft size={20} className="text-[var(--color-text-primary)]" />
          </button>
          <span className="text-[var(--color-text-primary)] font-semibold text-sm truncate">{address}</span>
        </div>

        <div className="mx-auto max-w-5xl px-4 pt-6 pb-16 space-y-10">
          <div className="text-center space-y-1">
            <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Inspection Results</h2>
            <p className="text-[var(--color-text-secondary)]">{address}</p>
          </div>

          {videoFile && videoObjectUrl ? (
            <AnnotatedPlayer videoSrc={videoObjectUrl} manifest={analysisResult.manifest} />
          ) : (
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
            onSeek={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />

          <div className="border-t border-[var(--color-border)]" />

          <NegotiationBrief result={analysisResult} address={address} />

          <div className="border-t border-[var(--color-border)]" />

          <div className="flex flex-wrap gap-3 justify-center pb-8">
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
                Copy Video Link
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  /* ─── Default: Home — tagline + scan + past analyses ─── */
  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      {/* ─── Hero / Tagline ─── */}
      <div className="flex flex-col items-center pt-12 pb-6 px-4">
        <motion.div {...fade(0)} className="flex items-center gap-2 mb-6">
          <div className="h-7 w-7 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
            <Home size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[var(--color-text-primary)] font-bold tracking-tight text-lg">HomeScope</span>
        </motion.div>

        <motion.h1
          {...fade(0.1)}
          className="text-center text-3xl sm:text-4xl font-bold tracking-tight leading-tight max-w-lg"
        >
          <span className="text-[var(--color-text-primary)]">Know what you&apos;re buying</span>{" "}
          <span className="text-[var(--color-text-secondary)]">before you offer.</span>
        </motion.h1>

        <motion.p
          {...fade(0.2)}
          className="mt-3 text-center text-[var(--color-text-secondary)] text-sm max-w-md"
        >
          Upload a walkthrough video. Get an AI inspection in 45 seconds.
        </motion.p>
      </div>

      {/* ─── Scan / Upload Card ─── */}
      <motion.div
        {...fade(0.3)}
        className="mx-auto w-full max-w-lg px-4 mb-10"
      >
        <div
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6"
          style={{ boxShadow: "0 2px 8px rgba(120,100,80,0.08), 0 8px 32px rgba(120,100,80,0.06)" }}
        >
          {/* Drop zone */}
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
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

      {/* ─── Past Analyses ─── */}
      {savedAnalyses.length > 0 && (
        <motion.div {...fade(0.4)} className="mx-auto max-w-lg px-4 pb-12">
          <h2 className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
            Your Properties
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savedAnalyses.map((a) => (
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
    </main>
  );
}
