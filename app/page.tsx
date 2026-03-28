"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/upload/dropzone";
import { AddressInput } from "@/components/upload/address-input";
import { VideoPreview } from "@/components/upload/video-preview";
import type { AppStage, FrameData, Finding, AnalysisResult } from "@/lib/types";

export default function Home() {
  const [stage, setStage] = useState<AppStage>("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setStage("processing");
    // Processing logic wired in Task 8
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
        <div className="mx-auto max-w-2xl px-4 py-16">
          <p className="text-center text-lg">Processing... (wired in Task 8)</p>
        </div>
      )}

      {stage === "results" && (
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-center text-lg">Results... (wired in Task 9-10)</p>
        </div>
      )}
    </main>
  );
}
