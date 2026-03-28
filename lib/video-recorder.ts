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

    const x = entry.bbox.x * width;
    const y = entry.bbox.y * height;
    const color = SEVERITY_COLORS[entry.severity];

    // Draw pill label (same as canvas-overlay but on recording canvas)
    const labelFont = "600 12px Inter, system-ui, sans-serif";
    const costFont = "700 11px Inter, system-ui, sans-serif";
    const labelH = 26;
    const r = labelH / 2;

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
    if (pillX + pillW > width - 4) pillX = width - pillW - 4;
    if (pillX < 4) pillX = 4;

    ctx.globalAlpha = opacity * 0.92;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, labelH, r);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = opacity * 0.4;
    ctx.stroke();

    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pillX + padX + dotR, pillY + labelH / 2, dotR, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = labelFont;
    ctx.fillStyle = "#1C1917";
    ctx.textBaseline = "middle";
    const labelStartX = pillX + padX + dotR * 2 + 6;
    ctx.fillText(entry.label, labelStartX, pillY + labelH / 2);

    ctx.font = costFont;
    ctx.fillStyle = color;
    ctx.fillText(costText, labelStartX + labelTextW + gap, pillY + labelH / 2);
    ctx.globalAlpha = 1;
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
