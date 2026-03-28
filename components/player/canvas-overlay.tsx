"use client";

import { useEffect, useRef } from "react";
import { SEVERITY_COLORS, FINDING_FADE_IN_MS, FINDING_FADE_OUT_MS } from "@/lib/constants";
import type { ManifestEntry } from "@/lib/types";

interface CanvasOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  manifest: ManifestEntry[];
  onActiveFindingsChange?: (ids: string[]) => void;
}

export function CanvasOverlay({ videoRef, manifest, onActiveFindingsChange }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const prevActiveIdsRef = useRef<string>("");

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d")!;

    const render = () => {
      const t = video.currentTime;
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width;
      const scaleY = canvas.height;
      const activeIds: string[] = [];

      for (const entry of manifest) {
        const isActive = t >= entry.timestamp_start && t <= entry.timestamp_end;
        if (!isActive) continue;

        activeIds.push(entry.id);

        // Calculate fade opacity
        const fadeInEnd = entry.timestamp_start + FINDING_FADE_IN_MS / 1000;
        const fadeOutStart = entry.timestamp_end - FINDING_FADE_OUT_MS / 1000;
        let opacity = 1;
        if (t < fadeInEnd) {
          opacity = (t - entry.timestamp_start) / (FINDING_FADE_IN_MS / 1000);
        } else if (t > fadeOutStart) {
          opacity = (entry.timestamp_end - t) / (FINDING_FADE_OUT_MS / 1000);
        }
        opacity = Math.max(0, Math.min(1, opacity));

        const x = entry.bbox.x * scaleX;
        const y = entry.bbox.y * scaleY;
        const w = entry.bbox.w * scaleX;
        const h = entry.bbox.h * scaleY;
        const color = SEVERITY_COLORS[entry.severity];

        // Draw bounding box
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, w, h);

        // Draw label card background
        const label = `${entry.label} — $${entry.repair_cost_low.toLocaleString()}–$${entry.repair_cost_high.toLocaleString()}`;
        ctx.font = "bold 13px system-ui, sans-serif";
        const textMetrics = ctx.measureText(label);
        const labelH = 24;
        const labelW = textMetrics.width + 16;
        const labelX = x;
        const labelY = Math.max(0, y - labelH - 4);

        ctx.fillStyle = color;
        ctx.globalAlpha = opacity * 0.9;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelW, labelH, 4);
        ctx.fill();

        // Draw label text
        ctx.globalAlpha = opacity;
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.fillText(label, labelX + 8, labelY + labelH / 2);
      }

      ctx.globalAlpha = 1;
      const activeKey = activeIds.join(",");
      if (activeKey !== prevActiveIdsRef.current) {
        prevActiveIdsRef.current = activeKey;
        onActiveFindingsChange?.(activeIds);
      }
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [videoRef, manifest, onActiveFindingsChange]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
