"use client";

import { useEffect, useRef } from "react";
import { SEVERITY_COLORS, FINDING_FADE_IN_MS, FINDING_FADE_OUT_MS } from "@/lib/constants";
import type { ManifestEntry } from "@/lib/types";

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/* ── Component ── */

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

        // Calculate fade opacity with smoothstep easing
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

        const x = entry.bbox.x * scaleX;
        const y = entry.bbox.y * scaleY;
        const color = SEVERITY_COLORS[entry.severity];

        // Draw pill-shaped label card
        const labelFont = "600 12px Inter, system-ui, sans-serif";
        const costFont = "700 11px Inter, system-ui, sans-serif";
        const labelH = 26;
        const r = labelH / 2; // pill radius

        ctx.font = labelFont;
        const labelTextW = ctx.measureText(entry.label).width;
        ctx.font = costFont;
        const costText = `$${entry.repair_cost_low.toLocaleString()}\u2013$${entry.repair_cost_high.toLocaleString()}`;
        const costTextW = ctx.measureText(costText).width;

        const dotR = 3.5;
        const gap = 10;
        const padX = 10;
        const pillW = padX + dotR * 2 + 6 + labelTextW + gap + costTextW + padX;

        let pillX = x;
        let pillY = Math.max(0, y - labelH - 6);
        // Clamp to canvas bounds
        if (pillX + pillW > canvas.width - 4) pillX = canvas.width - pillW - 4;
        if (pillX < 4) pillX = 4;

        // Draw pill background
        ctx.globalAlpha = opacity * 0.92;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, labelH, r);
        ctx.fill();

        // Draw pill border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = opacity * 0.4;
        ctx.stroke();

        // Draw severity dot
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pillX + padX + dotR, pillY + labelH / 2, dotR, 0, Math.PI * 2);
        ctx.fill();

        // Draw label text
        ctx.font = labelFont;
        ctx.fillStyle = "#1C1917";
        ctx.textBaseline = "middle";
        const labelStartX = pillX + padX + dotR * 2 + 6;
        ctx.fillText(entry.label, labelStartX, pillY + labelH / 2);

        // Draw cost text
        ctx.font = costFont;
        ctx.fillStyle = color;
        ctx.fillText(costText, labelStartX + labelTextW + gap, pillY + labelH / 2);
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
