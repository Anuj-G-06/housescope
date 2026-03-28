"use client";

import { useRef, useState, useCallback } from "react";
import { CanvasOverlay } from "./canvas-overlay";
import { FindingsSidebar } from "./findings-sidebar";
import type { ManifestEntry } from "@/lib/types";

interface AnnotatedPlayerProps {
  videoSrc: string; // object URL or Blob URL
  manifest: ManifestEntry[];
}

export function AnnotatedPlayer({ videoSrc, manifest }: AnnotatedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [currentFindingIdx, setCurrentFindingIdx] = useState(0);

  const handleSeek = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.play();
    }
  }, []);

  const jumpToFinding = (direction: "prev" | "next") => {
    const newIdx =
      direction === "next"
        ? Math.min(currentFindingIdx + 1, manifest.length - 1)
        : Math.max(currentFindingIdx - 1, 0);
    setCurrentFindingIdx(newIdx);
    handleSeek(manifest[newIdx].timestamp_start);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Video + Canvas */}
      <div className="space-y-3">
        <div className="relative bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            className="w-full"
            playsInline
          />
          <CanvasOverlay
            videoRef={videoRef}
            manifest={manifest}
            onActiveFindingsChange={setActiveIds}
          />
        </div>

        {/* Jump to finding nav */}
        <div className="flex items-center justify-center gap-3">
          <button
            className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm hover:bg-[var(--color-primary-bg)] transition-colors disabled:opacity-50 text-[var(--color-text-primary)]"
            onClick={() => jumpToFinding("prev")}
            disabled={currentFindingIdx === 0}
          >
            Prev Finding
          </button>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {currentFindingIdx + 1} / {manifest.length}
          </span>
          <button
            className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm hover:bg-[var(--color-primary-bg)] transition-colors disabled:opacity-50 text-[var(--color-text-primary)]"
            onClick={() => jumpToFinding("next")}
            disabled={currentFindingIdx === manifest.length - 1}
          >
            Next Finding
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div>
        <h3 className="text-sm font-medium mb-3 text-[var(--color-text-secondary)] uppercase tracking-wider">
          All Findings ({manifest.length})
        </h3>
        <FindingsSidebar
          manifest={manifest}
          activeIds={activeIds}
          onSeek={handleSeek}
        />
      </div>
    </div>
  );
}
