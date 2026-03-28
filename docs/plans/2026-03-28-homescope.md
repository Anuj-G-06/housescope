# HomeScope Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI-annotated home inspection video analysis tool for a hackathon demo — upload a walkthrough video, get back annotated playback with bounding boxes over defects plus an inspection report and negotiation brief.

**Architecture:** Single-page Next.js App Router app with three visual stages (Upload -> Processing -> Results). Client-side frame extraction via Canvas API avoids FFmpeg server dependency. Frames sent in batches to an API route that calls a vision LLM via AI SDK + AI Gateway, returning structured findings with bounding box coordinates. Client-side Canvas overlay renders annotations on top of HTML5 video playback. Vercel Blob stores uploaded videos for sharing.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS, shadcn/ui, Framer Motion, AI SDK v6 (AI Gateway), Vercel Blob, Canvas API, jsPDF

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frame extraction | Client-side Canvas API | Zero server deps, no FFmpeg binary issues on Vercel, works immediately |
| Video annotation | Client-side Canvas overlay | No server-side video encoding, instant, lightweight |
| AI calls | Batched from client (4-6 frames per request) | Avoids Vercel 4.5MB body limit, natural streaming UX |
| AI provider | AI Gateway (`anthropic/claude-sonnet-4.5` or latest vision model) | Unified billing, failover, no provider keys needed |
| Structured output | `generateText` + `Output.object()` | AI SDK v6 pattern for typed JSON responses |
| State management | React useState with stage enum | Simple, no external state lib needed for single-page app |
| Workflow DevKit | Not used | Overkill for a synchronous hackathon pipeline |

## Directory Structure

```
app/
  page.tsx                    -- Main page (Upload -> Processing -> Results)
  layout.tsx                  -- Root layout with fonts + metadata
  api/
    analyze-batch/
      route.ts                -- Vision analysis API (receives frame batch, returns findings)
    upload/
      route.ts                -- Vercel Blob upload handler
components/
  upload/
    dropzone.tsx              -- Drag-and-drop video upload zone
    address-input.tsx         -- Property address field
    video-preview.tsx         -- Client-side video preview before submit
  processing/
    processing-screen.tsx     -- Progress bar + streaming finding cards
    finding-card.tsx          -- Individual finding preview card
  player/
    annotated-player.tsx      -- HTML5 video + Canvas overlay controller
    canvas-overlay.tsx        -- Canvas rendering loop (bboxes + labels)
    findings-sidebar.tsx      -- Scrollable findings list with video seek
  report/
    risk-score.tsx            -- Animated 0-100 risk score bar
    findings-report.tsx       -- Grouped findings by severity
    cost-breakdown.tsx        -- Per-category repair cost summary
    negotiation-brief.tsx     -- Dollar ask + editable letter
lib/
  types.ts                    -- Shared TypeScript types (Finding, Manifest, etc.)
  constants.ts                -- Severity colors, categories, cost data
  frame-extractor.ts          -- Client-side Canvas frame extraction
  deduplication.ts            -- IoU-based finding merger
  manifest-builder.ts         -- Builds playback manifest from raw findings
  prompts.ts                  -- LLM system prompt + schema
  pdf-export.ts               -- jsPDF report generation
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `.env.local.example`

**Step 1: Create Next.js app**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```
Expected: Next.js project scaffolded in current directory.

**Step 2: Install core dependencies**

Run:
```bash
npm install ai @ai-sdk/react @vercel/blob framer-motion zod jspdf
```

**Step 3: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init
```
Select: New York style, Zinc base color, CSS variables = yes.

**Step 4: Add shadcn components we'll need**

Run:
```bash
npx shadcn@latest add button card input label progress badge separator scroll-area
```

**Step 5: Create `.env.local.example`**

```env
# Run: vercel link && vercel env pull (provisions OIDC token automatically)
# Or set manually:
# AI_GATEWAY_API_KEY=
BLOB_READ_WRITE_TOKEN=
```

**Step 6: Set up root layout**

Edit `app/layout.tsx` — add Geist font, dark mode class on html, basic metadata:

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeScope — AI Home Inspection",
  description: "Upload a walkthrough video. Get an annotated inspection report in 45 seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 7: Create placeholder main page**

Edit `app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold">HomeScope</h1>
    </main>
  );
}
```

**Step 8: Verify dev server starts**

Run: `npm run dev`
Expected: App loads at localhost:3000 with "HomeScope" heading.

**Step 9: Install Geist font package**

Run: `npm install geist`

**Step 10: Commit**

```bash
git add -A
git commit -m "scaffold: Next.js app with shadcn/ui, AI SDK, Vercel Blob"
```

---

## Task 2: Shared Types, Constants, and Prompts

**Files:**
- Create: `lib/types.ts`, `lib/constants.ts`, `lib/prompts.ts`

**Step 1: Create shared types**

Create `lib/types.ts`:

```typescript
export type Severity = "critical" | "high" | "medium" | "low";

export type Category =
  | "water_damage"
  | "structural"
  | "electrical"
  | "hvac"
  | "roof_ceiling"
  | "foundation"
  | "plumbing"
  | "safety";

export interface BBox {
  x: number; // normalized 0-1
  y: number;
  w: number;
  h: number;
}

export interface Finding {
  id: string;
  category: Category;
  severity: Severity;
  label: string;
  description: string;
  bbox: BBox;
  repair_cost_low: number;
  repair_cost_high: number;
  code_reference: string | null;
  confidence: number;
  frame_index: number;
  timestamp: number; // seconds into video
}

export interface ManifestEntry {
  id: string;
  category: Category;
  severity: Severity;
  label: string;
  description: string;
  bbox: BBox;
  repair_cost_low: number;
  repair_cost_high: number;
  code_reference: string | null;
  confidence: number;
  timestamp_start: number;
  timestamp_end: number;
}

export interface AnalysisResult {
  manifest: ManifestEntry[];
  risk_score: number;
  total_cost_low: number;
  total_cost_high: number;
}

export type AppStage = "upload" | "processing" | "results";

export interface FrameData {
  index: number;
  timestamp: number; // seconds
  data: string; // base64 JPEG
}

export interface BatchRequest {
  frames: FrameData[];
  address: string;
}

export interface BatchResponse {
  findings: Finding[];
}
```

**Step 2: Create constants**

Create `lib/constants.ts`:

```typescript
import { type Severity, type Category } from "./types";

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#ef4444", // red-500
  high: "#f97316",     // orange-500
  medium: "#eab308",   // yellow-500
  low: "#3b82f6",      // blue-500
};

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export const CATEGORY_LABELS: Record<Category, string> = {
  water_damage: "Water Damage",
  structural: "Structural",
  electrical: "Electrical",
  hvac: "HVAC",
  roof_ceiling: "Roof / Ceiling",
  foundation: "Foundation",
  plumbing: "Plumbing",
  safety: "Safety",
};

export const FRAMES_PER_SECOND = 0.5; // 1 frame every 2 seconds
export const BATCH_SIZE = 4;
export const FINDING_FADE_IN_MS = 200;
export const FINDING_FADE_OUT_MS = 300;
export const FINDING_DISPLAY_DURATION = 4; // seconds each finding shows on video
export const IOU_MERGE_THRESHOLD = 0.5;
export const CONFIDENCE_THRESHOLD = 0.75;
```

**Step 3: Create LLM system prompt**

Create `lib/prompts.ts`:

```typescript
export const SYSTEM_PROMPT = `You are a licensed home inspector analyzing video frames for defects. You have expertise across 8 categories:

1. Water Damage — stains, discoloration, bubbling paint, mold, moisture rings
2. Structural — cracks in walls/ceilings, sagging, bowing, settling signs
3. Electrical — exposed wiring, missing covers, double-tapped breakers, GFCI violations
4. HVAC — rust on units, improper venting, damaged ductwork, age indicators
5. Roof/Ceiling — missing shingles, sagging, daylight penetration, flashing issues
6. Foundation — cracks, efflorescence, water intrusion signs, uneven floors
7. Plumbing — corrosion, active leaks, improper connections, water heater issues
8. Safety — missing railings, trip hazards, carbon monoxide risks, fire hazards

Rules:
- Only report findings with confidence >= 0.75
- Provide bounding box coordinates as normalized fractions (0.0 to 1.0) of the frame dimensions
- bbox.x and bbox.y are the top-left corner
- Be conservative — false positives are worse than false negatives
- Include NEC/IRC code references where applicable
- Repair cost estimates should reflect mid-Atlantic US market (Pittsburgh area)
- Return ONLY valid JSON matching the schema. No prose, no markdown.`;

export const USER_PROMPT_TEMPLATE = (frameIndices: number[]) =>
  `Analyze these ${frameIndices.length} video frames (indices: ${frameIndices.join(", ")}) for home inspection defects. For each defect found, provide the frame_index it appears in, a bounding box, severity, category, label, description, repair cost range, and any applicable code reference. Return findings only for defects you can identify with >= 75% confidence.`;
```

**Step 4: Commit**

```bash
git add lib/types.ts lib/constants.ts lib/prompts.ts
git commit -m "feat: add shared types, severity constants, and LLM prompt"
```

---

## Task 3: Client-Side Frame Extraction

**Files:**
- Create: `lib/frame-extractor.ts`, `lib/__tests__/frame-extractor.test.ts`

**Step 1: Write the frame extraction utility**

Create `lib/frame-extractor.ts`:

```typescript
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit lib/frame-extractor.ts`
Expected: No type errors (note: DOM types needed — ensure `tsconfig.json` includes `"dom"` in lib).

**Step 3: Commit**

```bash
git add lib/frame-extractor.ts
git commit -m "feat: client-side frame extraction via Canvas API"
```

---

## Task 4: Upload UI

**Files:**
- Create: `components/upload/dropzone.tsx`, `components/upload/address-input.tsx`, `components/upload/video-preview.tsx`
- Modify: `app/page.tsx`

**Step 1: Create the dropzone component**

Create `components/upload/dropzone.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelect, disabled }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type === "video/mp4" || file.type === "video/quicktime")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <Card
      className={`relative flex flex-col items-center justify-center border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("video-input")?.click()}
    >
      <div className="mb-4 text-5xl">&#127968;</div>
      <p className="text-lg font-medium">Drop your walkthrough video here</p>
      <p className="mt-1 text-sm text-muted-foreground">MP4 or MOV, up to 3 minutes</p>
      <input
        id="video-input"
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        onChange={handleFileInput}
      />
    </Card>
  );
}
```

**Step 2: Create address input**

Create `components/upload/address-input.tsx`:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function AddressInput({ value, onChange }: AddressInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="address">Property Address</Label>
      <Input
        id="address"
        placeholder="123 Main St, Pittsburgh, PA 15201"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
```

**Step 3: Create video preview**

Create `components/upload/video-preview.tsx`:

```tsx
"use client";

interface VideoPreviewProps {
  file: File;
  onRemove: () => void;
}

export function VideoPreview({ file, onRemove }: VideoPreviewProps) {
  const url = URL.createObjectURL(file);

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <video
        src={url}
        controls
        className="w-full max-h-[300px] object-contain bg-black"
        onLoad={() => URL.revokeObjectURL(url)}
      />
      <div className="flex items-center justify-between p-3 bg-muted/50">
        <div className="text-sm">
          <span className="font-medium">{file.name}</span>
          <span className="ml-2 text-muted-foreground">
            ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-sm text-destructive hover:underline"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Wire up the main page with stage state**

Replace `app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/upload/dropzone";
import { AddressInput } from "@/components/upload/address-input";
import { VideoPreview } from "@/components/upload/video-preview";
import type { AppStage, FrameData, Finding, AnalysisResult } from "@/lib/types";

export default function Home() {
  const [stage, setStage] = useState<AppStage>("upload");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setStage("processing");
    // Processing logic wired in Task 7
  };

  return (
    <main className="min-h-screen bg-background">
      {stage === "upload" && (
        <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">HomeScope</h1>
            <p className="text-muted-foreground text-lg">
              Upload a walkthrough video. Get an AI inspection in 45 seconds.
            </p>
          </div>

          {!videoFile ? (
            <Dropzone onFileSelect={setVideoFile} />
          ) : (
            <VideoPreview file={videoFile} onRemove={() => setVideoFile(null)} />
          )}

          <AddressInput value={address} onChange={setAddress} />

          <Button
            size="lg"
            className="w-full text-lg h-14"
            disabled={!videoFile || !address}
            onClick={handleAnalyze}
          >
            Analyze Property
          </Button>
        </div>
      )}

      {stage === "processing" && (
        <div className="mx-auto max-w-2xl px-4 py-16">
          <p className="text-center text-lg">Processing... (wired in Task 7)</p>
        </div>
      )}

      {stage === "results" && (
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-center text-lg">Results... (wired in Task 9-10)</p>
        </div>
      )}
    </main>
  );
}
```

**Step 5: Verify upload UI renders**

Run: `npm run dev`
Expected: Upload page with dropzone, address input, and disabled "Analyze" button. Dropping a video shows preview. Filling address enables button.

**Step 6: Commit**

```bash
git add components/upload/ app/page.tsx
git commit -m "feat: upload UI with dropzone, address input, video preview"
```

---

## Task 5: Video Upload to Vercel Blob

**Files:**
- Create: `app/api/upload/route.ts`

**Step 1: Create upload API route**

Create `app/api/upload/route.ts`:

```typescript
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("video") as File;

  if (!file) {
    return NextResponse.json({ error: "No video file" }, { status: 400 });
  }

  const blob = await put(`homescope/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
```

**Step 2: Verify route compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: Vercel Blob upload API route"
```

---

## Task 6: AI Vision Analysis API Route

**Files:**
- Create: `app/api/analyze-batch/route.ts`

> **Important:** Before writing the API route, fetch the latest vision-capable model IDs:
> ```bash
> curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '[.data[] | select(.id | startswith("anthropic/")) | .id] | reverse | .[]'
> ```
> Use the latest Claude model with vision support.

**Step 1: Create the Zod schema for structured output**

This goes in `lib/prompts.ts` — append to existing file:

```typescript
import { z } from "zod";

export const batchFindingsSchema = z.object({
  frame_findings: z.array(
    z.object({
      frame_index: z.number(),
      findings: z.array(
        z.object({
          id: z.string(),
          category: z.enum([
            "water_damage", "structural", "electrical", "hvac",
            "roof_ceiling", "foundation", "plumbing", "safety",
          ]),
          severity: z.enum(["critical", "high", "medium", "low"]),
          label: z.string(),
          description: z.string(),
          bbox: z.object({
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
            w: z.number().min(0).max(1),
            h: z.number().min(0).max(1),
          }),
          repair_cost_low: z.number(),
          repair_cost_high: z.number(),
          code_reference: z.string().nullable(),
          confidence: z.number().min(0).max(1),
        })
      ),
    })
  ),
});
```

**Step 2: Create the analysis API route**

Create `app/api/analyze-batch/route.ts`:

```typescript
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, batchFindingsSchema } from "@/lib/prompts";
import type { BatchRequest, Finding } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { frames, address } = (await request.json()) as BatchRequest;

  const frameIndices = frames.map((f) => f.index);

  const result = await generateText({
    model: "anthropic/claude-sonnet-4.5", // update to latest after checking gateway
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...frames.map((f) => ({
            type: "image" as const,
            image: f.data, // base64
          })),
          {
            type: "text" as const,
            text: USER_PROMPT_TEMPLATE(frameIndices) +
              `\n\nProperty address: ${address}`,
          },
        ],
      },
    ],
    output: Output.object({ schema: batchFindingsSchema }),
  });

  const findings: Finding[] = [];
  if (result.output) {
    for (const frameFinding of result.output.frame_findings) {
      for (const f of frameFinding.findings) {
        if (f.confidence >= 0.75) {
          const sourceFrame = frames.find((fr) => fr.index === frameFinding.frame_index);
          findings.push({
            ...f,
            frame_index: frameFinding.frame_index,
            timestamp: sourceFrame?.timestamp ?? 0,
          });
        }
      }
    }
  }

  return NextResponse.json({ findings });
}
```

**Step 3: Verify route compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 4: Commit**

```bash
git add lib/prompts.ts app/api/analyze-batch/route.ts
git commit -m "feat: AI vision analysis API with structured output"
```

---

## Task 7: Finding Deduplication + Manifest Builder

**Files:**
- Create: `lib/deduplication.ts`, `lib/manifest-builder.ts`

**Step 1: Write the failing test for IoU calculation**

Create `lib/__tests__/deduplication.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateIoU, deduplicateFindings } from "../deduplication";

describe("calculateIoU", () => {
  it("returns 1 for identical boxes", () => {
    const box = { x: 0.1, y: 0.1, w: 0.3, h: 0.3 };
    expect(calculateIoU(box, box)).toBeCloseTo(1.0);
  });

  it("returns 0 for non-overlapping boxes", () => {
    const a = { x: 0.0, y: 0.0, w: 0.1, h: 0.1 };
    const b = { x: 0.5, y: 0.5, w: 0.1, h: 0.1 };
    expect(calculateIoU(a, b)).toBe(0);
  });

  it("returns value between 0 and 1 for partial overlap", () => {
    const a = { x: 0.0, y: 0.0, w: 0.4, h: 0.4 };
    const b = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
    const iou = calculateIoU(a, b);
    expect(iou).toBeGreaterThan(0);
    expect(iou).toBeLessThan(1);
  });
});

describe("deduplicateFindings", () => {
  it("merges findings with same category and high IoU across consecutive frames", () => {
    const findings = [
      {
        id: "f1", category: "water_damage" as const, severity: "critical" as const,
        label: "Water stain", description: "desc", confidence: 0.9,
        bbox: { x: 0.2, y: 0.1, w: 0.3, h: 0.3 },
        repair_cost_low: 4000, repair_cost_high: 9000,
        code_reference: null, frame_index: 0, timestamp: 0,
      },
      {
        id: "f2", category: "water_damage" as const, severity: "critical" as const,
        label: "Water stain", description: "desc", confidence: 0.85,
        bbox: { x: 0.21, y: 0.11, w: 0.3, h: 0.3 },
        repair_cost_low: 4000, repair_cost_high: 9000,
        code_reference: null, frame_index: 1, timestamp: 2,
      },
    ];
    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp_start).toBe(0);
    expect(result[0].timestamp_end).toBeGreaterThan(0);
  });

  it("keeps distinct findings separate", () => {
    const findings = [
      {
        id: "f1", category: "water_damage" as const, severity: "critical" as const,
        label: "Water stain", description: "desc", confidence: 0.9,
        bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
        repair_cost_low: 4000, repair_cost_high: 9000,
        code_reference: null, frame_index: 0, timestamp: 0,
      },
      {
        id: "f2", category: "electrical" as const, severity: "medium" as const,
        label: "GFCI violation", description: "desc", confidence: 0.8,
        bbox: { x: 0.7, y: 0.7, w: 0.2, h: 0.2 },
        repair_cost_low: 150, repair_cost_high: 300,
        code_reference: "NEC 210.8", frame_index: 0, timestamp: 0,
      },
    ];
    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/deduplication.test.ts`
Expected: FAIL — module not found.

> If vitest is not installed, run `npm install -D vitest` first.

**Step 3: Implement deduplication**

Create `lib/deduplication.ts`:

```typescript
import { IOU_MERGE_THRESHOLD, FINDING_DISPLAY_DURATION } from "./constants";
import type { BBox, Finding, ManifestEntry } from "./types";

export function calculateIoU(a: BBox, b: BBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersection = intersectionWidth * intersectionHeight;

  if (intersection === 0) return 0;

  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const union = areaA + areaB - intersection;

  return intersection / union;
}

export function deduplicateFindings(findings: Finding[]): ManifestEntry[] {
  const sorted = [...findings].sort((a, b) => a.timestamp - b.timestamp);
  const merged: ManifestEntry[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;

    const base = sorted[i];
    let timestampEnd = base.timestamp + FINDING_DISPLAY_DURATION;
    let bestConfidence = base.confidence;
    let bestBbox = base.bbox;

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const candidate = sorted[j];

      if (
        candidate.category === base.category &&
        calculateIoU(base.bbox, candidate.bbox) >= IOU_MERGE_THRESHOLD
      ) {
        used.add(j);
        timestampEnd = candidate.timestamp + FINDING_DISPLAY_DURATION;
        if (candidate.confidence > bestConfidence) {
          bestConfidence = candidate.confidence;
          bestBbox = candidate.bbox;
        }
      }
    }

    merged.push({
      id: base.id,
      category: base.category,
      severity: base.severity,
      label: base.label,
      description: base.description,
      bbox: bestBbox,
      repair_cost_low: base.repair_cost_low,
      repair_cost_high: base.repair_cost_high,
      code_reference: base.code_reference,
      confidence: bestConfidence,
      timestamp_start: base.timestamp,
      timestamp_end: timestampEnd,
    });
  }

  return merged;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/deduplication.test.ts`
Expected: All tests PASS.

**Step 5: Create manifest builder**

Create `lib/manifest-builder.ts`:

```typescript
import { SEVERITY_ORDER } from "./constants";
import type { AnalysisResult, ManifestEntry, Severity } from "./types";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

export function buildAnalysisResult(manifest: ManifestEntry[]): AnalysisResult {
  const totalCostLow = manifest.reduce((sum, f) => sum + f.repair_cost_low, 0);
  const totalCostHigh = manifest.reduce((sum, f) => sum + f.repair_cost_high, 0);

  const rawScore = manifest.reduce(
    (sum, f) => sum + SEVERITY_WEIGHT[f.severity] * f.confidence,
    0
  );
  const riskScore = Math.min(100, Math.round(rawScore));

  return {
    manifest: manifest.sort((a, b) => {
      const severityDiff =
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return a.timestamp_start - b.timestamp_start;
    }),
    risk_score: riskScore,
    total_cost_low: totalCostLow,
    total_cost_high: totalCostHigh,
  };
}
```

**Step 6: Commit**

```bash
git add lib/deduplication.ts lib/manifest-builder.ts lib/__tests__/
git commit -m "feat: finding deduplication with IoU merging + manifest builder"
```

---

## Task 8: Processing Screen

**Files:**
- Create: `components/processing/processing-screen.tsx`, `components/processing/finding-card.tsx`
- Modify: `app/page.tsx`

**Step 1: Create finding card component**

Create `components/processing/finding-card.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SEVERITY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import type { Finding } from "@/lib/types";

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 flex items-start gap-3">
        <div
          className="mt-1 h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: SEVERITY_COLORS[finding.severity] }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{finding.label}</span>
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_LABELS[finding.category]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ${finding.repair_cost_low.toLocaleString()} &ndash; $
            {finding.repair_cost_high.toLocaleString()}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
```

**Step 2: Create processing screen**

Create `components/processing/processing-screen.tsx`:

```tsx
"use client";

import { Progress } from "@/components/ui/progress";
import { FindingCard } from "./finding-card";
import type { Finding } from "@/lib/types";

interface ProcessingScreenProps {
  progress: number; // 0-100
  framesAnalyzed: number;
  totalFrames: number;
  findings: Finding[];
  statusText: string;
}

export function ProcessingScreen({
  progress,
  framesAnalyzed,
  totalFrames,
  findings,
  statusText,
}: ProcessingScreenProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Analyzing Your Property</h2>
        <p className="text-muted-foreground">{statusText}</p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{framesAnalyzed} / {totalFrames} frames analyzed</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {findings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Findings
          </h3>
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Wire processing into page.tsx — full pipeline orchestration**

Update `app/page.tsx` `handleAnalyze` function to:
1. Extract frames (client-side)
2. Upload video to Blob (parallel)
3. Send frame batches to `/api/analyze-batch`
4. Accumulate findings, update progress
5. Deduplicate + build manifest
6. Transition to results

```tsx
// Add these imports to app/page.tsx:
import { extractFrames } from "@/lib/frame-extractor";
import { deduplicateFindings } from "@/lib/deduplication";
import { buildAnalysisResult } from "@/lib/manifest-builder";
import { ProcessingScreen } from "@/components/processing/processing-screen";
import { BATCH_SIZE } from "@/lib/constants";
import type { Finding, FrameData } from "@/lib/types";

// Add these state variables alongside existing ones:
const [progress, setProgress] = useState(0);
const [framesAnalyzed, setFramesAnalyzed] = useState(0);
const [totalFrames, setTotalFrames] = useState(0);
const [liveFindings, setLiveFindings] = useState<Finding[]>([]);
const [statusText, setStatusText] = useState("");
const [videoUrl, setVideoUrl] = useState<string | null>(null);

// Replace handleAnalyze:
const handleAnalyze = async () => {
  if (!videoFile) return;
  setStage("processing");
  setStatusText("Extracting frames from video...");

  // Step 1: Extract frames
  const frames = await extractFrames(videoFile, (pct) => {
    setProgress(pct * 0.3); // 0-30% for extraction
  });
  setTotalFrames(frames.length);
  setStatusText("Analyzing frames with AI vision...");

  // Step 2: Upload video to Blob (fire and forget)
  const uploadForm = new FormData();
  uploadForm.append("video", videoFile);
  fetch("/api/upload", { method: "POST", body: uploadForm })
    .then((res) => res.json())
    .then((data) => setVideoUrl(data.url))
    .catch(console.error);

  // Step 3: Send batches to analysis API
  const allFindings: Finding[] = [];
  const batches: FrameData[][] = [];
  for (let i = 0; i < frames.length; i += BATCH_SIZE) {
    batches.push(frames.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const res = await fetch("/api/analyze-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frames: batch, address }),
    });
    const data = await res.json();
    allFindings.push(...data.findings);
    setLiveFindings([...allFindings]);
    setFramesAnalyzed((i + 1) * BATCH_SIZE);
    setProgress(30 + ((i + 1) / batches.length) * 60); // 30-90%
  }

  // Step 4: Deduplicate and build result
  setStatusText("Building inspection report...");
  setProgress(95);
  const manifest = deduplicateFindings(allFindings);
  const result = buildAnalysisResult(manifest);
  setAnalysisResult(result);
  setProgress(100);
  setStage("results");
};

// Update the processing stage render:
{stage === "processing" && (
  <ProcessingScreen
    progress={progress}
    framesAnalyzed={framesAnalyzed}
    totalFrames={totalFrames}
    findings={liveFindings}
    statusText={statusText}
  />
)}
```

**Step 4: Verify processing screen renders**

Run: `npm run dev`
Expected: After selecting a video and clicking Analyze, the processing screen appears with progress bar and streaming finding cards.

**Step 5: Commit**

```bash
git add components/processing/ app/page.tsx
git commit -m "feat: processing screen with progress bar and streaming finding cards"
```

---

## Task 9: Annotated Video Player

**Files:**
- Create: `components/player/annotated-player.tsx`, `components/player/canvas-overlay.tsx`, `components/player/findings-sidebar.tsx`

This is the core technical centerpiece and demo moment.

**Step 1: Create the Canvas overlay renderer**

Create `components/player/canvas-overlay.tsx`:

```tsx
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
      onActiveFindingsChange?.(activeIds);
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
```

**Step 2: Create the findings sidebar**

Create `components/player/findings-sidebar.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SEVERITY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import type { ManifestEntry } from "@/lib/types";

interface FindingsSidebarProps {
  manifest: ManifestEntry[];
  activeIds: string[];
  onSeek: (timestamp: number) => void;
}

export function FindingsSidebar({ manifest, activeIds, onSeek }: FindingsSidebarProps) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-1">
        {manifest.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSeek(entry.timestamp_start)}
            className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
              activeIds.includes(entry.id)
                ? "border-primary bg-accent"
                : "border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[entry.severity] }}
              />
              <span className="font-medium text-sm">{entry.label}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {CATEGORY_LABELS[entry.category]}
              </Badge>
              <span>
                {formatTimestamp(entry.timestamp_start)}
              </span>
              <span>
                ${entry.repair_cost_low.toLocaleString()}–${entry.repair_cost_high.toLocaleString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
```

**Step 3: Create the main annotated player**

Create `components/player/annotated-player.tsx`:

```tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
        <div className="relative rounded-lg overflow-hidden bg-black">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => jumpToFinding("prev")}
            disabled={currentFindingIdx === 0}
          >
            Prev Finding
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentFindingIdx + 1} / {manifest.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => jumpToFinding("next")}
            disabled={currentFindingIdx === manifest.length - 1}
          >
            Next Finding
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div>
        <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
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
```

**Step 4: Wire player into results stage of page.tsx**

In `app/page.tsx`, update the results stage:

```tsx
// Add imports:
import { AnnotatedPlayer } from "@/components/player/annotated-player";

// In the results stage render, add:
{stage === "results" && analysisResult && videoFile && (
  <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
    <div className="text-center space-y-1">
      <h2 className="text-3xl font-bold">Inspection Results</h2>
      <p className="text-muted-foreground">{address}</p>
    </div>

    <AnnotatedPlayer
      videoSrc={URL.createObjectURL(videoFile)}
      manifest={analysisResult.manifest}
    />

    {/* Report components added in Task 10 */}
  </div>
)}
```

**Step 5: Verify annotated player renders with mock data**

Run: `npm run dev`
Expected: After analysis completes, video plays with colored bounding boxes and label cards appearing/disappearing in sync with timestamps. Sidebar shows all findings. Clicking a finding jumps the video.

**Step 6: Commit**

```bash
git add components/player/
git commit -m "feat: annotated video player with Canvas overlay and findings sidebar"
```

---

## Task 10: Inspection Report

**Files:**
- Create: `components/report/risk-score.tsx`, `components/report/findings-report.tsx`, `components/report/cost-breakdown.tsx`

**Step 1: Create animated risk score**

Create `components/report/risk-score.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";

interface RiskScoreProps {
  score: number; // 0-100
}

function getRiskLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "High Risk", color: "#ef4444" };
  if (score >= 40) return { label: "Moderate Risk", color: "#f97316" };
  if (score >= 15) return { label: "Low Risk", color: "#eab308" };
  return { label: "Minimal Risk", color: "#22c55e" };
}

export function RiskScore({ score }: RiskScoreProps) {
  const { label, color } = getRiskLabel(score);

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          <motion.circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-muted-foreground uppercase">/ 100</span>
        </div>
      </div>
      <span className="text-lg font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
```

**Step 2: Create findings report (grouped by severity)**

Create `components/report/findings-report.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_COLORS, CATEGORY_LABELS, SEVERITY_ORDER } from "@/lib/constants";
import type { ManifestEntry, Severity } from "@/lib/types";

interface FindingsReportProps {
  manifest: ManifestEntry[];
  onSeek: (timestamp: number) => void;
}

export function FindingsReport({ manifest, onSeek }: FindingsReportProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const grouped = SEVERITY_ORDER.reduce(
    (acc, severity) => {
      const items = manifest.filter((f) => f.severity === severity);
      if (items.length > 0) acc[severity] = items;
      return acc;
    },
    {} as Record<Severity, ManifestEntry[]>
  );

  const severityLabel: Record<Severity, string> = {
    critical: "Critical Issues",
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
  };

  return (
    <div className="space-y-6">
      {SEVERITY_ORDER.map((severity) => {
        const items = grouped[severity];
        if (!items) return null;

        return (
          <div key={severity}>
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[severity] }}
              />
              {severityLabel[severity]} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((entry) => (
                <Card
                  key={entry.id}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() =>
                    setExpanded(expanded === entry.id ? null : entry.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium">{entry.label}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[entry.category]}
                        </Badge>
                        {entry.code_reference && (
                          <Badge variant="secondary" className="text-xs font-mono">
                            {entry.code_reference}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-mono whitespace-nowrap">
                      ${entry.repair_cost_low.toLocaleString()}–$
                      {entry.repair_cost_high.toLocaleString()}
                    </span>
                  </div>

                  {expanded === entry.id && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground space-y-2">
                      <p>{entry.description}</p>
                      <button
                        className="text-primary hover:underline text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(entry.timestamp_start);
                        }}
                      >
                        Jump to video timestamp &rarr;
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 3: Create cost breakdown**

Create `components/report/cost-breakdown.tsx`:

```tsx
"use client";

import { Separator } from "@/components/ui/separator";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Category, ManifestEntry } from "@/lib/types";

interface CostBreakdownProps {
  manifest: ManifestEntry[];
  totalCostLow: number;
  totalCostHigh: number;
}

export function CostBreakdown({ manifest, totalCostLow, totalCostHigh }: CostBreakdownProps) {
  const byCategory = manifest.reduce(
    (acc, f) => {
      if (!acc[f.category]) acc[f.category] = { low: 0, high: 0, count: 0 };
      acc[f.category].low += f.repair_cost_low;
      acc[f.category].high += f.repair_cost_high;
      acc[f.category].count += 1;
      return acc;
    },
    {} as Record<Category, { low: number; high: number; count: number }>
  );

  const negotiationLow = Math.round(totalCostLow * 0.7);
  const negotiationHigh = Math.round(totalCostHigh * 0.85);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Estimated Repair Costs</h3>

      <div className="space-y-2">
        {Object.entries(byCategory).map(([cat, costs]) => (
          <div key={cat} className="flex justify-between text-sm">
            <span>
              {CATEGORY_LABELS[cat as Category]}{" "}
              <span className="text-muted-foreground">({costs.count})</span>
            </span>
            <span className="font-mono">
              ${costs.low.toLocaleString()} – ${costs.high.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex justify-between font-semibold">
        <span>Total Estimated Range</span>
        <span className="font-mono">
          ${totalCostLow.toLocaleString()} – ${totalCostHigh.toLocaleString()}
        </span>
      </div>

      <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 mt-4">
        <p className="text-sm font-medium text-primary">Negotiation Recommendation</p>
        <p className="text-2xl font-bold mt-1">
          Request ${negotiationLow.toLocaleString()} – ${negotiationHigh.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Based on 70–85% of estimated repair costs — standard negotiation range
        </p>
      </div>
    </div>
  );
}
```

**Step 4: Wire report components into results stage**

In `app/page.tsx` results stage, add below the `<AnnotatedPlayer>`:

```tsx
import { RiskScore } from "@/components/report/risk-score";
import { FindingsReport } from "@/components/report/findings-report";
import { CostBreakdown } from "@/components/report/cost-breakdown";

// Inside the results stage render, after AnnotatedPlayer:
<Separator className="my-8" />

<div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
  <RiskScore score={analysisResult.risk_score} />
  <CostBreakdown
    manifest={analysisResult.manifest}
    totalCostLow={analysisResult.total_cost_low}
    totalCostHigh={analysisResult.total_cost_high}
  />
</div>

<Separator className="my-8" />

<FindingsReport
  manifest={analysisResult.manifest}
  onSeek={(t) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Player seek handled by ref — wire if needed
  }}
/>
```

**Step 5: Verify full results page renders**

Run: `npm run dev`
Expected: Results page shows annotated video, risk score with animation, cost breakdown with negotiation recommendation, and expandable findings report.

**Step 6: Commit**

```bash
git add components/report/ app/page.tsx
git commit -m "feat: inspection report with risk score, cost breakdown, negotiation rec"
```

---

## Task 11: Negotiation Letter + PDF Export

**Files:**
- Create: `components/report/negotiation-brief.tsx`, `lib/pdf-export.ts`

**Step 1: Create negotiation letter component**

Create `components/report/negotiation-brief.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AnalysisResult } from "@/lib/types";

interface NegotiationBriefProps {
  result: AnalysisResult;
  address: string;
}

export function NegotiationBrief({ result, address }: NegotiationBriefProps) {
  const negotiationLow = Math.round(result.total_cost_low * 0.7);
  const negotiationHigh = Math.round(result.total_cost_high * 0.85);

  const defaultLetter = `Dear [Agent Name],

Following our review of the property at ${address}, an AI-assisted inspection analysis has identified ${result.manifest.length} issue(s) requiring attention, with estimated repair costs ranging from $${result.total_cost_low.toLocaleString()} to $${result.total_cost_high.toLocaleString()}.

Key findings include:
${result.manifest
  .slice(0, 5)
  .map((f) => `- ${f.label} (${f.severity}): $${f.repair_cost_low.toLocaleString()}–$${f.repair_cost_high.toLocaleString()}`)
  .join("\n")}

Based on standard negotiation practices and the scope of repairs needed, we are requesting a price reduction of $${negotiationLow.toLocaleString()} to $${negotiationHigh.toLocaleString()}, or equivalent credit at closing.

A detailed inspection report with annotated video documentation is available for review.

Best regards,
[Your Name]`;

  const [letter, setLetter] = useState(defaultLetter);

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Negotiation Letter</h3>
      <Card className="p-4">
        <textarea
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          className="w-full min-h-[300px] bg-transparent resize-none text-sm leading-relaxed focus:outline-none"
        />
      </Card>
      <div className="flex gap-3">
        <Button onClick={handleCopy} variant="outline">
          Copy to Clipboard
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Create PDF export utility**

Create `lib/pdf-export.ts`:

```typescript
import jsPDF from "jspdf";
import { SEVERITY_ORDER, CATEGORY_LABELS } from "./constants";
import type { AnalysisResult, Severity } from "./types";

export function exportReportPDF(result: AnalysisResult, address: string) {
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.text("HomeScope Inspection Report", 20, y);
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(address, 20, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
  y += 12;

  // Risk score
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text(`Risk Score: ${result.risk_score} / 100`, 20, y);
  y += 8;

  // Cost summary
  doc.setFontSize(11);
  doc.text(
    `Total Estimated Repairs: $${result.total_cost_low.toLocaleString()} – $${result.total_cost_high.toLocaleString()}`,
    20, y
  );
  y += 6;
  const negLow = Math.round(result.total_cost_low * 0.7);
  const negHigh = Math.round(result.total_cost_high * 0.85);
  doc.text(
    `Negotiation Range: $${negLow.toLocaleString()} – $${negHigh.toLocaleString()}`,
    20, y
  );
  y += 12;

  // Findings
  doc.setFontSize(14);
  doc.text("Findings", 20, y);
  y += 8;

  doc.setFontSize(10);
  for (const entry of result.manifest) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`[${entry.severity.toUpperCase()}] ${entry.label}`, 20, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`${CATEGORY_LABELS[entry.category]} | $${entry.repair_cost_low.toLocaleString()}–$${entry.repair_cost_high.toLocaleString()}`, 24, y);
    y += 5;

    const descLines = doc.splitTextToSize(entry.description, 160);
    doc.text(descLines, 24, y);
    y += descLines.length * 4.5 + 4;

    if (entry.code_reference) {
      doc.text(`Code: ${entry.code_reference}`, 24, y);
      y += 6;
    }
  }

  // Disclaimer
  y += 10;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "DISCLAIMER: This is an AI-assisted triage report, not a licensed home inspection. " +
    "Consult a licensed home inspector for a definitive assessment.",
    20, y,
    { maxWidth: 170 }
  );

  doc.save(`HomeScope-Report-${Date.now()}.pdf`);
}
```

**Step 3: Wire negotiation brief and PDF button into results page**

In `app/page.tsx`, add to the results stage below the FindingsReport:

```tsx
import { NegotiationBrief } from "@/components/report/negotiation-brief";
import { exportReportPDF } from "@/lib/pdf-export";

// Add after FindingsReport:
<Separator className="my-8" />

<NegotiationBrief result={analysisResult} address={address} />

<Separator className="my-8" />

<div className="flex gap-3 justify-center pb-12">
  <Button
    variant="outline"
    onClick={() => exportReportPDF(analysisResult, address)}
  >
    Export PDF Report
  </Button>
  {videoUrl && (
    <Button
      variant="outline"
      onClick={() => navigator.clipboard.writeText(videoUrl)}
    >
      Copy Shareable Video Link
    </Button>
  )}
  <Button variant="ghost" onClick={() => {
    setStage("upload");
    setVideoFile(null);
    setAddress("");
    setAnalysisResult(null);
    setLiveFindings([]);
  }}>
    Analyze Another Property
  </Button>
</div>
```

**Step 4: Verify full flow**

Run: `npm run dev`
Expected: Complete flow works — upload, processing, annotated video, report, negotiation letter, PDF download.

**Step 5: Commit**

```bash
git add components/report/negotiation-brief.tsx lib/pdf-export.ts app/page.tsx
git commit -m "feat: negotiation letter with clipboard copy + PDF export"
```

---

## Task 12: Polish + Demo Prep

**Files:**
- Modify: `app/page.tsx`, `app/globals.css`

**Step 1: Add page transitions with Framer Motion**

Wrap each stage in `app/page.tsx` with `<AnimatePresence>` and `<motion.div>`:

```tsx
import { AnimatePresence, motion } from "framer-motion";

// Wrap the stage conditionals:
<AnimatePresence mode="wait">
  {stage === "upload" && (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* upload content */}
    </motion.div>
  )}
  {/* Same for processing and results */}
</AnimatePresence>
```

**Step 2: Add header/branding across all stages**

Add a sticky header to `app/page.tsx`:

```tsx
<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
  <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
    <span className="text-lg font-bold tracking-tight">HomeScope</span>
    {stage !== "upload" && (
      <span className="text-sm text-muted-foreground">{address}</span>
    )}
  </div>
</header>
```

**Step 3: Add AI disclaimer footer**

```tsx
<footer className="border-t py-6 text-center text-xs text-muted-foreground">
  AI-assisted triage — not a substitute for a licensed home inspection.
</footer>
```

**Step 4: Run typecheck + build**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: No type errors, build succeeds.

**Step 5: Commit**

```bash
git add -A
git commit -m "polish: page transitions, branding header, disclaimer footer"
```

**Step 6: Deploy to Vercel**

Run:
```bash
vercel deploy
```
Expected: Preview URL generated. Test full flow on deployed version.

**Step 7: Final commit + production deploy**

```bash
vercel --prod
```

---

## Environment Setup Checklist

Before starting implementation, ensure:

1. [ ] Vercel CLI installed (`npm i -g vercel`)
2. [ ] Vercel project linked (`vercel link`)
3. [ ] AI Gateway enabled in Vercel dashboard
4. [ ] Environment variables pulled (`vercel env pull`)
5. [ ] Vercel Blob storage provisioned (via Marketplace or dashboard)
6. [ ] `BLOB_READ_WRITE_TOKEN` in `.env.local`
7. [ ] OIDC credentials provisioned via `vercel env pull` (preferred) or `AI_GATEWAY_API_KEY` set manually

---

## Notes for the Implementer

- **Model selection:** Before writing the API route, run the curl command in Task 6 to get the latest vision-capable model ID. Prefer the highest-versioned Claude or GPT model with vision support.
- **Frame count tuning:** `FRAMES_PER_SECOND = 0.5` (1 frame every 2 seconds) keeps batch sizes reasonable. For a 60-second video = 30 frames = ~8 batches of 4. Adjust in `lib/constants.ts` if needed.
- **Body size:** Each batch of 4 frames at 70% JPEG quality should be ~200-400KB total. Well within Vercel's 4.5MB limit.
- **Demo video:** Source 1-2 walkthrough videos with clear defects before starting. Pre-run analysis to know exactly what the demo will show.
- **Canvas `roundRect`:** Requires modern browsers. If compatibility issues arise, replace with manual path drawing.
- **No Workflow DevKit:** The pipeline is synchronous batch processing — WDK's durable execution adds complexity without hackathon benefit.
