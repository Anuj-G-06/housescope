"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/upload/dropzone";
import { AddressInput } from "@/components/upload/address-input";
import { VideoPreview } from "@/components/upload/video-preview";
import { extractFrames } from "@/lib/frame-extractor";
import { deduplicateFindings } from "@/lib/deduplication";
import { buildAnalysisResult } from "@/lib/manifest-builder";
import { ProcessingScreen } from "@/components/processing/processing-screen";
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
      const res = await fetch("/api/analyze-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames: batch, address }),
      });
      const data = await res.json();
      allFindings.push(...data.findings);
      setLiveFindings([...allFindings]);
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

      {stage === "results" && (
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-center text-lg">Results... (wired in Task 9-10)</p>
        </div>
      )}
    </main>
  );
}
