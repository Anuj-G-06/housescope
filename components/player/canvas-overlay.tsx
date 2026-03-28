"use client";

import { useEffect, useRef } from "react";
import { SEVERITY_COLORS, FINDING_FADE_IN_MS, FINDING_FADE_OUT_MS } from "@/lib/constants";
import type { ManifestEntry } from "@/lib/types";

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Compute the actual rendered video rect inside a container using object-contain.
 * Returns { offsetX, offsetY, renderW, renderH }.
 */
function getVideoRect(video: HTMLVideoElement) {
  const cw = video.clientWidth;
  const ch = video.clientHeight;
  const vw = video.videoWidth || cw;
  const vh = video.videoHeight || ch;

  const containerRatio = cw / ch;
  const videoRatio = vw / vh;

  let renderW: number, renderH: number, offsetX: number, offsetY: number;

  if (videoRatio > containerRatio) {
    // Video wider than container — pillarboxed vertically (bars top/bottom)
    renderW = cw;
    renderH = cw / videoRatio;
    offsetX = 0;
    offsetY = (ch - renderH) / 2;
  } else {
    // Video taller than container — letterboxed horizontally (bars left/right)
    renderH = ch;
    renderW = ch * videoRatio;
    offsetX = (cw - renderW) / 2;
    offsetY = 0;
  }

  return { offsetX, offsetY, renderW, renderH };
}

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

      // Get actual rendered video area (accounts for object-contain letterboxing)
      const { offsetX, offsetY, renderW, renderH } = getVideoRect(video);
      const activeIds: string[] = [];

      for (const entry of manifest) {
        const isActive = t >= entry.timestamp_start && t <= entry.timestamp_end;
        if (!isActive) continue;

        activeIds.push(entry.id);

        const fadeInEnd = entry.timestamp_start + FINDING_FADE_IN_MS / 1000;
        const fadeOutStart = entry.timestamp_end - FINDING_FADE_OUT_MS / 1000;
        let opacity = 1;
        if (t < fadeInEnd) {
          const p = Math.max(0, Math.min(1, (t - entry.timestamp_start) / (FINDING_FADE_IN_MS / 1000)));
          opacity = smoothstep(p);
        } else if (t > fadeOutStart) {
          const p = Math.max(0, Math.min(1, (entry.timestamp_end - t) / (FINDING_FADE_OUT_MS / 1000)));
          opacity = smoothstep(p);
        }

        // Map normalized coords to actual rendered video area
        const x = offsetX + entry.bbox.x * renderW;
        const y = offsetY + entry.bbox.y * renderH;
        const color = SEVERITY_COLORS[entry.severity];

        // Scale pill size for small screens
        const scale = Math.min(1, renderW / 350);
        const labelFont = `600 ${Math.round(12 * scale)}px Inter, system-ui, sans-serif`;
        const costFont = `700 ${Math.round(11 * scale)}px Inter, system-ui, sans-serif`;
        const labelH = Math.round(24 * scale);
        const r = labelH / 2;
        const dotR = Math.round(3 * scale);
        const gap = Math.round(8 * scale);
        const padX = Math.round(8 * scale);

        ctx.font = labelFont;
        const labelTextW = ctx.measureText(entry.label).width;
        ctx.font = costFont;
        const costText = `$${entry.repair_cost_low.toLocaleString()}\u2013$${entry.repair_cost_high.toLocaleString()}`;
        const costTextW = ctx.measureText(costText).width;

        let pillW = padX + dotR * 2 + 4 + labelTextW + gap + costTextW + padX;

        // If pill too wide, drop cost text
        let showCost = true;
        if (pillW > renderW - 8) {
          pillW = padX + dotR * 2 + 4 + labelTextW + padX;
          showCost = false;
        }

        let pillX = x;
        let pillY = y - labelH - 4;
        // Flip below if clipping top
        if (pillY < offsetY + 2) {
          const bboxBottom = offsetY + entry.bbox.y * renderH + entry.bbox.h * renderH;
          pillY = bboxBottom + 4;
        }
        // Clamp bottom
        if (pillY + labelH > offsetY + renderH - 2) {
          pillY = offsetY + renderH - labelH - 2;
        }
        // Clamp horizontal within rendered video area
        if (pillX + pillW > offsetX + renderW - 2) pillX = offsetX + renderW - pillW - 2;
        if (pillX < offsetX + 2) pillX = offsetX + 2;

        // Pill background
        ctx.globalAlpha = opacity * 0.92;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, labelH, r);
        ctx.fill();

        // Pill border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = opacity * 0.4;
        ctx.stroke();

        // Severity dot
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pillX + padX + dotR, pillY + labelH / 2, dotR, 0, Math.PI * 2);
        ctx.fill();

        // Label text
        ctx.font = labelFont;
        ctx.fillStyle = "#1C1917";
        ctx.textBaseline = "middle";
        const labelStartX = pillX + padX + dotR * 2 + 4;
        ctx.fillText(entry.label, labelStartX, pillY + labelH / 2);

        // Cost text (only if space)
        if (showCost) {
          ctx.font = costFont;
          ctx.fillStyle = color;
          ctx.fillText(costText, labelStartX + labelTextW + gap, pillY + labelH / 2);
        }
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
