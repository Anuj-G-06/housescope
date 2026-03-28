"use client";

import { useRef, useState, useCallback } from "react";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { CanvasOverlay } from "./canvas-overlay";
import { FindingsSidebar } from "./findings-sidebar";
import { recordAnnotatedVideo } from "@/lib/video-recorder";
import type { ManifestEntry } from "@/lib/types";

interface AnnotatedPlayerProps {
  videoSrc: string;
  manifest: ManifestEntry[];
}

export function AnnotatedPlayer({ videoSrc, manifest }: AnnotatedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [currentFindingIdx, setCurrentFindingIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  const handleSeek = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.play();
    }
  }, []);

  const handleDownloadVideo = async () => {
    setIsRecording(true);
    setRecordProgress(0);
    try {
      const blob = await recordAnnotatedVideo(videoSrc, manifest, setRecordProgress);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "HomeScope-Annotated-Video.webm";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Recording failed:", err);
    }
    setIsRecording(false);
  };

  const jumpToFinding = (direction: "prev" | "next") => {
    const newIdx =
      direction === "next"
        ? Math.min(currentFindingIdx + 1, manifest.length - 1)
        : Math.max(currentFindingIdx - 1, 0);
    setCurrentFindingIdx(newIdx);
    handleSeek(manifest[newIdx].timestamp_start);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Video — fills available space */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3">
        {/* Video + Canvas */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="relative bg-black rounded-xl overflow-hidden flex-1 min-h-0">
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              className="w-full h-full object-contain"
              playsInline
            />
            <CanvasOverlay
              videoRef={videoRef}
              manifest={manifest}
              onActiveFindingsChange={setActiveIds}
            />
          </div>
        </div>

        {/* Sidebar — scrollable on desktop, horizontal strip on mobile */}
        <div className="lg:w-72 shrink-0 lg:overflow-y-auto">
          <FindingsSidebar
            manifest={manifest}
            activeIds={activeIds}
            onSeek={handleSeek}
          />
        </div>
      </div>

      {/* Controls bar */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-3 py-2 border-t border-[var(--color-border)] bg-white">
        <button
          className="p-2 rounded-lg bg-white border border-[var(--color-border)] hover:bg-[var(--color-primary-bg)] transition-colors disabled:opacity-30"
          onClick={() => jumpToFinding("prev")}
          disabled={currentFindingIdx === 0}
        >
          <ChevronLeft size={18} className="text-[var(--color-text-primary)]" />
        </button>
        <span className="text-xs text-[var(--color-text-muted)] tabular w-12 text-center">
          {currentFindingIdx + 1}/{manifest.length}
        </span>
        <button
          className="p-2 rounded-lg bg-white border border-[var(--color-border)] hover:bg-[var(--color-primary-bg)] transition-colors disabled:opacity-30"
          onClick={() => jumpToFinding("next")}
          disabled={currentFindingIdx === manifest.length - 1}
        >
          <ChevronRight size={18} className="text-[var(--color-text-primary)]" />
        </button>
        <button
          className="ml-2 p-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
          onClick={handleDownloadVideo}
          disabled={isRecording}
          title={isRecording ? `Recording ${Math.round(recordProgress)}%` : "Download annotated video"}
        >
          <Download size={18} />
        </button>
      </div>
    </div>
  );
}
