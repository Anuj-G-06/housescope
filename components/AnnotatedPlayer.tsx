"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type MouseEvent,
} from "react";
import { Maximize, Minimize, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import type { Finding } from "@/lib/types";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#F43F5E",
  high: "#FB923C",
  medium: "#FBBF24",
  low: "#38BDF8",
};

const FADE_IN = 0.4;
const FADE_OUT = 0.4;
const CORNER_LEN = 20;
const CORNER_W = 3;
const LABEL_FONT = '700 13px Inter, system-ui, sans-serif';
const COST_FONT = '600 11px Inter, system-ui, sans-serif';
const LABEL_PAD_X = 10;
const LABEL_PAD_Y = 6;
const LABEL_RADIUS = 8;
const LABEL_GAP = 8;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function easeAlpha(t: number, start: number, end: number): number {
  const dur = end - start;
  if (dur <= 0) return 1;
  const fadeInEnd = start + FADE_IN;
  const fadeOutStart = end - FADE_OUT;
  if (t < fadeInEnd) {
    const p = clamp((t - start) / FADE_IN, 0, 1);
    return p * p * (3 - 2 * p); // smoothstep
  }
  if (t > fadeOutStart) {
    const p = clamp((end - t) / FADE_OUT, 0, 1);
    return p * p * (3 - 2 * p);
  }
  return 1;
}

function drawCornerAccents(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = CORNER_W;
  ctx.globalAlpha = alpha;
  ctx.lineCap = "square";

  const cl = Math.min(CORNER_LEN, w / 3, h / 3);

  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + cl);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cl, y);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - cl, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + cl);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w, y + h - cl);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - cl, y + h);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x + cl, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - cl);
  ctx.stroke();

  ctx.restore();
}

function drawLabelCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxW: number,
  label: string,
  costText: string,
  color: string,
  alpha: number,
  canvasW: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.font = LABEL_FONT;
  const labelW = ctx.measureText(label).width;
  ctx.font = COST_FONT;
  const costW = ctx.measureText(costText).width;
  const dotR = 4;
  const gap = 12;

  const totalW = dotR * 2 + 6 + labelW + gap + costW + LABEL_PAD_X * 2;
  const cardW = Math.min(totalW, Math.max(maxW, 180));
  const cardH = 28;

  let cx = x;
  let cy = y - cardH - LABEL_GAP;
  if (cx + cardW > canvasW - 4) cx = canvasW - cardW - 4;
  if (cx < 4) cx = 4;
  if (cy < 4) cy = y + LABEL_GAP;

  // Rounded rect
  ctx.beginPath();
  ctx.roundRect(cx, cy, cardW, cardH, LABEL_RADIUS);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.9;
  ctx.fill();
  ctx.globalAlpha = alpha;

  // Severity dot
  const dotCx = cx + LABEL_PAD_X + dotR;
  const dotCy = cy + cardH / 2;
  ctx.beginPath();
  ctx.arc(dotCx, dotCy, dotR, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();

  // Label text
  ctx.font = LABEL_FONT;
  ctx.fillStyle = "white";
  ctx.textBaseline = "middle";
  ctx.fillText(label, dotCx + dotR + 6, dotCy, cardW - LABEL_PAD_X * 2 - dotR * 2 - 6 - gap - costW);

  // Cost text
  ctx.font = COST_FONT;
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = "white";
  ctx.textAlign = "right";
  ctx.fillText(costText, cx + cardW - LABEL_PAD_X, dotCy);

  ctx.restore();
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatCost(low: number, high: number): string {
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`);
  return `~${fmt(low)}–${fmt(high)}`;
}

interface Props {
  videoUrl: string;
  findings: Finding[];
  onFindingActive?: (id: string) => void;
}

export default function AnnotatedPlayer({ videoUrl, findings, onFindingActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const activeFindingsRef = useRef<Set<string>>(new Set());

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);

  const sortedFindings = [...findings].sort(
    (a, b) => a.timestamp_start - b.timestamp_start,
  );

  // Resize observer to sync canvas with video display dimensions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const ro = new ResizeObserver(() => {
      setCanvasSize({ w: video.clientWidth, h: video.clientHeight });
    });
    ro.observe(video);
    return () => ro.disconnect();
  }, []);

  // Canvas rendering loop
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const t = video.currentTime;
    setCurrentTime(t);

    const newActive = new Set<string>();

    for (const f of findings) {
      if (t < f.timestamp_start || t > f.timestamp_end) continue;

      newActive.add(f.id);

      const alpha = easeAlpha(t, f.timestamp_start, f.timestamp_end);
      const color = SEVERITY_COLOR[f.severity] ?? "#38BDF8";
      const bx = f.bbox.x * cw;
      const by = f.bbox.y * ch;
      const bw = f.bbox.w * cw;
      const bh = f.bbox.h * ch;

      // Outer glow
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();

      // Corner accents
      drawCornerAccents(ctx, bx, by, bw, bh, color, alpha);

      // Label card
      const costText = formatCost(f.repair_cost_low, f.repair_cost_high);
      drawLabelCard(ctx, bx, by, bw, f.label, costText, color, alpha, cw);
    }

    // Fire callbacks for newly-active findings
    newActive.forEach((id) => {
      if (!activeFindingsRef.current.has(id)) {
        onFindingActive?.(id);
      }
    });
    activeFindingsRef.current = newActive;

    if (!video.paused) {
      rafRef.current = requestAnimationFrame(renderFrame);
    }
  }, [findings, onFindingActive]);

  // Start/stop render loop based on play state
  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(renderFrame);
    } else {
      cancelAnimationFrame(rafRef.current);
      renderFrame();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, renderFrame]);

  // Re-render when canvas resizes
  useEffect(() => {
    renderFrame();
  }, [canvasSize, renderFrame]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = time;
    setCurrentTime(time);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      return;
    }
    setShowControls(true);
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [playing, currentTime]);

  // Finding navigation
  const currentFindingIdx = sortedFindings.findIndex(
    (f) => currentTime >= f.timestamp_start && currentTime <= f.timestamp_end,
  );

  const jumpToFinding = useCallback(
    (dir: -1 | 1) => {
      let target: Finding | undefined;
      if (dir === 1) {
        target = sortedFindings.find((f) => f.timestamp_start > currentTime + 0.5);
        if (!target) target = sortedFindings[0];
      } else {
        const reversed = [...sortedFindings].reverse();
        target = reversed.find((f) => f.timestamp_start < currentTime - 0.5);
        if (!target) target = sortedFindings[sortedFindings.length - 1];
      }
      if (target) seekTo(target.timestamp_start);
    },
    [sortedFindings, currentTime, seekTo],
  );

  const handleTimelineClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      seekTo(pct * duration);
    },
    [duration, seekTo],
  );

  const handleTimelineHover = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      setHoverTime(pct * duration);
    },
    [duration],
  );

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden bg-black border border-white/10 group"
      style={{ boxShadow: "0 0 40px rgba(0,0,0,0.6)" }}
      onMouseMove={() => playing && setShowControls(true)}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full block object-contain"
        playsInline
        preload="metadata"
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onClick={togglePlay}
      />

      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: canvasSize.w, height: canvasSize.h }}
      />

      {/* Click-to-play overlay (when paused and at start) */}
      {!playing && currentTime < 0.5 && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </button>
      )}

      {/* ─── Bottom controls ─── */}
      <div
        className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Gradient fade */}
        <div className="h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        <div className="absolute inset-x-0 bottom-0 px-4 pb-3 flex flex-col gap-2">
          {/* Timeline */}
          <div
            className="relative w-full h-5 flex items-center cursor-pointer group/tl"
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Track */}
            <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full top-1/2 -translate-y-1/2">
              {/* Played fill */}
              <div
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
              {/* Hover scrub preview */}
              {hoverTime !== null && (
                <div
                  className="absolute top-[-28px] -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none"
                  style={{ left: `${(hoverTime / (duration || 1)) * 100}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Finding markers */}
            {sortedFindings.map((f) =>
              duration ? (
                <div
                  key={f.id}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full z-10"
                  style={{
                    left: `${(f.timestamp_start / duration) * 100}%`,
                    backgroundColor: SEVERITY_COLOR[f.severity],
                  }}
                  title={f.label}
                />
              ) : null,
            )}
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors">
                {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
              </button>
              <span className="text-white text-sm tabular-nums font-light">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Finding jump controls */}
              <button
                onClick={() => jumpToFinding(-1)}
                className="flex items-center gap-1 bg-black/60 backdrop-blur border border-white/10 text-white text-xs rounded-full px-3 py-1 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              <button
                onClick={() => jumpToFinding(1)}
                className="flex items-center gap-1 bg-black/60 backdrop-blur border border-white/10 text-white text-xs rounded-full px-3 py-1 hover:bg-white/10 transition-colors"
              >
                Next
                <ChevronRight size={12} />
              </button>

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-white/80 transition-colors ml-1"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
