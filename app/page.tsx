"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/upload/dropzone";
import { AddressInput } from "@/components/upload/address-input";
import { VideoPreview } from "@/components/upload/video-preview";
import { extractFrames } from "@/lib/frame-extractor";
import { deduplicateFindings } from "@/lib/deduplication";
import { buildAnalysisResult } from "@/lib/manifest-builder";
import { ProcessingScreen } from "@/components/processing/processing-screen";
import { AnnotatedPlayer } from "@/components/player/annotated-player";
import { RiskScore } from "@/components/report/risk-score";
import { FindingsReport } from "@/components/report/findings-report";
import { CostBreakdown } from "@/components/report/cost-breakdown";
import { NegotiationBrief } from "@/components/report/negotiation-brief";
import { Separator } from "@/components/ui/separator";
import { exportReportPDF } from "@/lib/pdf-export";
import { BATCH_SIZE } from "@/lib/constants";
import type { AppStage, FrameData, Finding, AnalysisResult } from "@/lib/types";

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

  const videoObjectUrl = useMemo(() => {
    if (videoFile && stage === "results") return URL.createObjectURL(videoFile);
    return null;
  }, [videoFile, stage]);

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setStage("processing");
    setStatusText("Extracting frames from video...");

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

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const res = await fetch("/api/analyze-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames: batch, address }),
        });
        if (!res.ok) {
          console.error(`Batch ${i} failed with status ${res.status}`);
          continue;
        }
        const data = await res.json();
        allFindings.push(...data.findings);
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
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
          <span className="text-lg font-bold tracking-tight">HomeScope</span>
          {stage !== "upload" && (
            <span className="text-sm text-muted-foreground">{address}</span>
          )}
        </div>
      </header>

      {stage === "upload" && (
        <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">HomeScope</h1>
            <p className="text-muted-foreground text-lg">
              Upload a walkthrough video. Get an AI inspection in 45 seconds.
            </p>
          </div>

          {!videoFile ? (
            <Dropzone onFileSelect={setVideoFile} />
          ) : (
            <VideoPreview file={videoFile} onRemove={() => setVideoFile(null)} />
          )}

          <AddressInput value={address} onChange={setAddress} />

          <Button
            size="lg"
            className="w-full text-lg h-14"
            disabled={!videoFile || !address}
            onClick={handleAnalyze}
          >
            Analyze Property
          </Button>
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

      {stage === "results" && analysisResult && videoFile && (
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
          <div className="text-center space-y-1">
            <h2 className="text-3xl font-bold">Inspection Results</h2>
            <p className="text-muted-foreground">{address}</p>
          </div>

          <AnnotatedPlayer
            videoSrc={videoObjectUrl!}
            manifest={analysisResult.manifest}
          />

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
            <RiskScore score={analysisResult.risk_score} />
            <CostBreakdown
              manifest={analysisResult.manifest}
              totalCostLow={analysisResult.total_cost_low}
              totalCostHigh={analysisResult.total_cost_high}
            />
          </div>

          <Separator />

          <FindingsReport
            manifest={analysisResult.manifest}
            onSeek={(t) => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />

          <Separator />

          <NegotiationBrief result={analysisResult} address={address} />

          <Separator />

          <div className="flex gap-3 justify-center pb-12">
            <Button
              variant="outline"
              onClick={() => exportReportPDF(analysisResult, address)}
            >
              Export PDF Report
            </Button>
            {videoUrl && (
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(videoUrl)}
              >
                Copy Shareable Video Link
              </Button>
            )}
            <Button variant="ghost" onClick={() => {
              setStage("upload");
              setVideoFile(null);
              setAddress("");
              setAnalysisResult(null);
              setLiveFindings([]);
            }}>
              Analyze Another Property
            </Button>
          </div>
        </div>
      )}

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        AI-assisted triage — not a substitute for a licensed home inspection.
      </footer>
    </main>
  );
}
