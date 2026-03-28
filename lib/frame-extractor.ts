import { FRAMES_PER_SECOND } from "./constants";
import type { FrameData } from "./types";

export async function extractFrames(
  videoFile: File,
  onProgress?: (pct: number) => void
): Promise<FrameData[]> {
  const url = URL.createObjectURL(videoFile);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });

  const duration = video.duration;
  const interval = 1 / FRAMES_PER_SECOND; // seconds between frames
  const timestamps: number[] = [];
  for (let t = 0; t < duration; t += interval) {
    timestamps.push(t);
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;

  const frames: FrameData[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    video.currentTime = timestamp;

    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const base64 = dataUrl.split(",")[1];

    frames.push({
      index: i,
      timestamp,
      data: base64,
    });

    onProgress?.(((i + 1) / timestamps.length) * 100);
  }

  URL.revokeObjectURL(url);
  return frames;
}

export async function extractThumbnail(videoFile: File): Promise<string> {
  const url = URL.createObjectURL(videoFile);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });

  video.currentTime = video.duration * 0.25;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = Math.round(320 * (video.videoHeight / video.videoWidth));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.6);
}
