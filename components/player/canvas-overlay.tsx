"use client";

import { useEffect, useRef } from "react";
import { SEVERITY_COLORS, FINDING_FADE_IN_MS, FINDING_FADE_OUT_MS } from "@/lib/constants";
import type { ManifestEntry } from "@/lib/types";

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
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

      const activeIds: string[] = [];
      const activeFindings: { entry: ManifestEntry; opacity: number }[] = [];

      for (const entry of manifest) {
        if (t < entry.timestamp_start || t > entry.timestamp_end) continue;
        activeIds.push(entry.id);

        const fadeInEnd = entry.timestamp_start + FINDING_FADE_IN_MS / 1000;
        const fadeOutStart = entry.timestamp_end - FINDING_FADE_OUT_MS / 1000;
        let opacity = 1;
        if (t < fadeInEnd) {
          opacity = smoothstep(Math.max(0, Math.min(1, (t - entry.timestamp_start) / (FINDING_FADE_IN_MS / 1000))));
        } else if (t > fadeOutStart) {
          opacity = smoothstep(Math.max(0, Math.min(1, (entry.timestamp_end - t) / (FINDING_FADE_OUT_MS / 1000))));
        }
        activeFindings.push({ entry, opacity });
      }

      if (activeFindings.length > 0) {
        // Caption-style: stack from bottom, centered, like subtitles
        const scale = Math.min(1, canvas.width / 350);
        const font = `600 ${Math.round(13 * scale)}px Inter, system-ui, sans-serif`;
        const costFont = `700 ${Math.round(11 * scale)}px Inter, system-ui, sans-serif`;
        const lineH = Math.round(30 * scale);
        const lineGap = Math.round(4 * scale);
        const padX = Math.round(12 * scale);
        const dotR = Math.round(4 * scale);
        const bottomPad = Math.round(48 * scale); // above video controls

        let cursorY = canvas.height - bottomPad;

        for (let i = activeFindings.length - 1; i >= 0; i--) {
          const { entry, opacity } = activeFindings[i];
          const color = SEVERITY_COLORS[entry.severity];

          // Measure
          ctx.font = font;
          const labelW = ctx.measureText(entry.label).width;
          ctx.font = costFont;
          const costText = `$${entry.repair_cost_low.toLocaleString()}\u2013$${entry.repair_cost_high.toLocaleString()}`;
          const costW = ctx.measureText(costText).width;

          const innerGap = Math.round(10 * scale);
          const totalW = padX + dotR * 2 + 6 + labelW + innerGap + costW + padX;
          const capW = Math.min(totalW, canvas.width - 16);
          const capX = (canvas.width - capW) / 2;
          const capY = cursorY - lineH;

          if (capY < 4) continue;

          // Dark backdrop — like a subtitle bar
          ctx.globalAlpha = opacity * 0.88;
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.beginPath();
          ctx.roundRect(capX, capY, capW, lineH, lineH / 2);
          ctx.fill();

          // Severity dot
          ctx.globalAlpha = opacity;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(capX + padX + dotR, capY + lineH / 2, dotR, 0, Math.PI * 2);
          ctx.fill();

          // Label
          ctx.font = font;
          ctx.fillStyle = "#FFFFFF";
          ctx.textBaseline = "middle";
          const textX = capX + padX + dotR * 2 + 6;
          ctx.fillText(entry.label, textX, capY + lineH / 2);

          // Cost (if fits)
          if (totalW <= capW) {
            ctx.font = costFont;
            ctx.fillStyle = color;
            ctx.fillText(costText, textX + labelW + innerGap, capY + lineH / 2);
          }

          cursorY = capY - lineGap;
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
