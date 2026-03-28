import { SEVERITY_COLORS, FINDING_FADE_IN_MS, FINDING_FADE_OUT_MS } from "./constants";
import type { ManifestEntry } from "./types";

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  manifest: ManifestEntry[],
  currentTime: number,
  width: number,
  height: number,
) {
  // Collect active findings
  const active: { entry: ManifestEntry; opacity: number }[] = [];

  for (const entry of manifest) {
    if (currentTime < entry.timestamp_start || currentTime > entry.timestamp_end) continue;

    const fadeInEnd = entry.timestamp_start + FINDING_FADE_IN_MS / 1000;
    const fadeOutStart = entry.timestamp_end - FINDING_FADE_OUT_MS / 1000;
    let opacity = 1;
    if (currentTime < fadeInEnd) {
      opacity = smoothstep(Math.max(0, Math.min(1, (currentTime - entry.timestamp_start) / (FINDING_FADE_IN_MS / 1000))));
    } else if (currentTime > fadeOutStart) {
      opacity = smoothstep(Math.max(0, Math.min(1, (entry.timestamp_end - currentTime) / (FINDING_FADE_OUT_MS / 1000))));
    }
    active.push({ entry, opacity });
  }

  if (active.length === 0) return;

  // Subtitle-style: stack pills from bottom up, centered
  const labelFont = "600 13px Inter, system-ui, sans-serif";
  const costFont = "700 11px Inter, system-ui, sans-serif";
  const pillH = 28;
  const pillGap = 6;
  const pillR = pillH / 2;
  const dotR = 3.5;
  const padX = 10;
  const innerGap = 8;
  const bottomMargin = 16;

  let cursorY = height - bottomMargin;

  for (let i = active.length - 1; i >= 0; i--) {
    const { entry, opacity } = active[i];
    const color = SEVERITY_COLORS[entry.severity];

    ctx.font = labelFont;
    const labelTextW = ctx.measureText(entry.label).width;
    ctx.font = costFont;
    const costText = `$${entry.repair_cost_low.toLocaleString()}\u2013$${entry.repair_cost_high.toLocaleString()}`;
    const costTextW = ctx.measureText(costText).width;

    const pillW = padX + dotR * 2 + 4 + labelTextW + innerGap + costTextW + padX;
    const pillX = (width - pillW) / 2;
    const pillY = cursorY - pillH;

    if (pillY < 4) continue;

    // Dark backdrop pill
    ctx.globalAlpha = opacity * 0.85;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
    ctx.fill();

    // Left color accent
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, 4, pillH, [pillR, 0, 0, pillR]);
    ctx.fill();

    // Severity dot
    ctx.beginPath();
    ctx.arc(pillX + padX + dotR + 2, pillY + pillH / 2, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Label text
    ctx.font = labelFont;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    const labelStartX = pillX + padX + dotR * 2 + 8;
    ctx.fillText(entry.label, labelStartX, pillY + pillH / 2);

    // Cost text
    ctx.font = costFont;
    ctx.fillStyle = color;
    ctx.fillText(costText, labelStartX + labelTextW + innerGap, pillY + pillH / 2);

    ctx.globalAlpha = 1;
    cursorY = pillY - pillGap;
  }
}

export async function recordAnnotatedVideo(
  videoSrc: string,
  manifest: ManifestEntry[],
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = videoSrc;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: "video/webm" }));
      };

      recorder.onerror = () => reject(new Error("Recording failed"));

      recorder.start();

      const renderFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawOverlay(ctx, manifest, video.currentTime, canvas.width, canvas.height);

        onProgress?.(Math.min(100, (video.currentTime / video.duration) * 100));
        requestAnimationFrame(renderFrame);
      };

      video.onended = () => {
        recorder.stop();
        onProgress?.(100);
      };

      video.play().then(() => {
        renderFrame();
      });
    };

    video.onerror = () => reject(new Error("Failed to load video"));
  });
}
