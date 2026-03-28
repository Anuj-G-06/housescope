"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type MouseEvent,
} from "react";
import { Maximize, Minimize, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import type { Finding } from "@/lib/types";
import { SEVERITY_CONFIG, type Severity } from "@/lib/severity";

export interface AnnotatedPlayerHandle {
  seekTo: (time: number) => void;
}

const FADE_IN = 0.4;
const FADE_OUT = 0.4;
const CORNER_LEN = 16;
const CORNER_W = 3;
const LABEL_FONT = '600 12px Inter, system-ui, sans-serif';
const COST_FONT = '700 11px Inter, system-ui, sans-serif';
const LABEL_PAD_X = 10;
const LABEL_H = 26;
const LABEL_GAP = 6;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function easeAlpha(t: number, start: number, end: number): number {
  const fadeInEnd = start + FADE_IN;
  const fadeOutStart = end - FADE_OUT;
  if (t < fadeInEnd) {
    const p = clamp((t - start) / FADE_IN, 0, 1);
    return p * p * (3 - 2 * p);
  }
  if (t > fadeOutStart) {
    const p = clamp((end - t) / FADE_OUT, 0, 1);
    return p * p * (3 - 2 * p);
  }
  return 1;
}

function drawCornerAccents(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, alpha: number,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = CORNER_W;
  ctx.globalAlpha = alpha;
  ctx.lineCap = "square";
  const cl = Math.min(CORNER_LEN, w / 3, h / 3);

  ctx.beginPath();
  ctx.moveTo(x, y + cl); ctx.lineTo(x, y); ctx.lineTo(x + cl, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - cl, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cl);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w, y + h - cl); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cl, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + cl, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - cl);
  ctx.stroke();

  ctx.restore();
}

function drawLabelPill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, bboxW: number,
  label: string, costText: string,
  color: string, alpha: number, canvasW: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.font = LABEL_FONT;
  const labelW = ctx.measureText(label).width;
  ctx.font = COST_FONT;
  const costW = ctx.measureText(costText).width;
  const dotR = 3.5;
  const gap = 10;

  const totalW = dotR * 2 + 6 + labelW + gap + costW + LABEL_PAD_X * 2;
  const cardW = Math.min(totalW, Math.max(bboxW, 160));
  const cardH = LABEL_H;
  const r = cardH / 2; // pill radius

  let cx = x;
  let cy = y - cardH - LABEL_GAP;
  if (cx + cardW > canvasW - 4) cx = canvasW - cardW - 4;
  if (cx < 4) cx = 4;
  if (cy < 4) cy = y + LABEL_GAP;

  // White pill with warm shadow
  ctx.beginPath();
  ctx.roundRect(cx, cy, cardW, cardH, r);
  ctx.fillStyle = "white";
  ctx.shadowColor = "rgba(120,100,80,0.12)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Border in severity color
  ctx.beginPath();
  ctx.roundRect(cx, cy, cardW, cardH, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * 0.4;
  ctx.stroke();
  ctx.globalAlpha = alpha;

  // Severity dot
  const dotCx = cx + LABEL_PAD_X + dotR;
  const dotCy = cy + cardH / 2;
  ctx.beginPath();
  ctx.arc(dotCx, dotCy, dotR, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Label text in severity color
  ctx.font = LABEL_FONT;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(label, dotCx + dotR + 6, dotCy, cardW - LABEL_PAD_X * 2 - dotR * 2 - 6 - gap - costW);

  // Cost text
  ctx.font = COST_FONT;
  ctx.fillStyle = "#1C1917";
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

const AnnotatedPlayer = forwardRef<AnnotatedPlayerHandle, Props>(function AnnotatedPlayer(
  { videoUrl, findings, onFindingActive },
  ref,
) {
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

  const sortedFindings = [...findings].sort((a, b) => a.timestamp_start - b.timestamp_start);

  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = time;
    setCurrentTime(time);
  }, []);

  useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const ro = new ResizeObserver(() => {
      setCanvasSize({ w: video.clientWidth, h: video.clientHeight });
    });
    ro.observe(video);
    return () => ro.disconnect();
  }, []);

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
      const sev = SEVERITY_CONFIG[f.severity as Severity];
      const color = sev?.color ?? "#5A9BB8";
      const px = f.bbox.x * cw;
      const py = f.bbox.y * ch;
      const pw = f.bbox.w * cw;
      const ph = f.bbox.h * ch;

      // Soft fill inside bbox
      ctx.save();
      ctx.globalAlpha = alpha * 0.06;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 6);
      ctx.fill();
      ctx.restore();

      // Glow pass
      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 6);
      ctx.stroke();
      ctx.restore();

      // Crisp border
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 6);
      ctx.stroke();
      ctx.restore();

      // Corner accents
      drawCornerAccents(ctx, px, py, pw, ph, color, alpha);

      // Label pill
      const costText = formatCost(f.repair_cost_low, f.repair_cost_high);
      drawLabelPill(ctx, px, py, pw, f.label, costText, color, alpha, cw);
    }

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

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(renderFrame);
    } else {
      cancelAnimationFrame(rafRef.current);
      renderFrame();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, renderFrame]);

  useEffect(() => { renderFrame(); }, [canvasSize, renderFrame]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!playing) { setShowControls(true); return; }
    setShowControls(true);
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [playing, currentTime]);

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
      className="relative rounded-2xl overflow-hidden bg-[#1C1917] border border-border group shadow-warm-lg"
      onMouseMove={() => playing && setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full block object-contain"
        playsInline
        preload="metadata"
        onLoadedMetadata={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); }}
        onClick={togglePlay}
      />

      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: canvasSize.w, height: canvasSize.h }}
      />

      {!playing && currentTime < 0.5 && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
        >
          <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm shadow-warm-lg flex items-center justify-center">
            <Play size={28} className="text-primary ml-1" fill="#7BB8D4" />
          </div>
        </button>
      )}

      {/* ─── Bottom controls ─── */}
      <div className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-3 flex flex-col gap-2">
          {/* Timeline */}
          <div
            className="relative w-full h-5 flex items-center cursor-pointer"
            onClick={handleTimelineClick}
            onMouseMove={handleTimelineHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full top-1/2 -translate-y-1/2">
              <div
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
              />
              {hoverTime !== null && (
                <div
                  className="absolute top-[-28px] -translate-x-1/2 bg-white text-text-primary text-xs px-2 py-1 rounded shadow-warm pointer-events-none"
                  style={{ left: `${(hoverTime / (duration || 1)) * 100}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>
            {sortedFindings.map((f) =>
              duration ? (
                <div
                  key={f.id}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full z-10"
                  style={{
                    left: `${(f.timestamp_start / duration) * 100}%`,
                    backgroundColor: SEVERITY_CONFIG[f.severity as Severity]?.color ?? "#5A9BB8",
                  }}
                  title={f.label}
                />
              ) : null,
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors duration-150">
                {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
              </button>
              <span className="text-white text-sm tabular font-light">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => jumpToFinding(-1)}
                className="flex items-center gap-1 bg-white/10 backdrop-blur border border-white/20 text-white text-xs rounded-full px-3 py-1 hover:bg-white/20 transition-all duration-150"
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              <button
                onClick={() => jumpToFinding(1)}
                className="flex items-center gap-1 bg-white/10 backdrop-blur border border-white/20 text-white text-xs rounded-full px-3 py-1 hover:bg-white/20 transition-all duration-150"
              >
                Next
                <ChevronRight size={12} />
              </button>
              <button onClick={toggleFullscreen} className="text-white hover:text-white/80 transition-colors duration-150 ml-1">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AnnotatedPlayer;
