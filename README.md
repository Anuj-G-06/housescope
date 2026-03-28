# HouseScope

AI-powered home inspection from walkthrough videos. Upload a 30-60 second video of a property, get an annotated inspection report with defect detection, repair cost estimates, and a negotiation letter — in under a minute.

## What It Does

1. **Upload** a walkthrough video (MP4, MOV, or WebM)
2. **AI analyzes** every frame using Google Gemini vision
3. **Get results** across three views:
   - **Video** — original footage with subtitle-style defect captions
   - **Report** — risk score + categorized findings table
   - **Costs** — repair cost breakdown + ready-to-send negotiation letter

## Key Features

- Frame-by-frame AI vision analysis via Google Gemini 2.5 Flash
- Caption-style video overlays (severity-colored, no bounding boxes)
- Conservative cost estimation with $30K sanity cap
- PDF export for inspection report and damage table
- Editable negotiation letter with PDF download
- Video persistence via IndexedDB (past analyses keep their video)
- Mobile-first design with bottom tab navigation
- Demo mode with mock data when no API key is set

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **AI:** Vercel AI SDK v6 + Google Gemini (`@ai-sdk/google`)
- **Styling:** Tailwind CSS v4, warm cream palette
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Storage:** localStorage (findings) + IndexedDB (videos)
- **PDF:** jsPDF

## Getting Started

```bash
# Install dependencies
npm install

# Set up Gemini API key
cp .env.local.example .env.local
# Edit .env.local and add your GOOGLE_GENERATIVE_AI_API_KEY

# Run dev server
npm run dev
```

Open http://localhost:3000

### Demo Mode

If no API key is configured, the app runs in demo mode with mock data — the full UI works, you just get the same 4 sample findings regardless of video content.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | For real analysis | Google AI Studio API key |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob storage for shareable video links |

## Project Structure

```
app/
  page.tsx                  -- Main app (home, processing, results views)
  api/
    analyze-batch/route.ts  -- Gemini vision analysis endpoint
    upload/route.ts         -- Vercel Blob upload endpoint
components/
  home/                     -- Homepage cards and views
  player/                   -- Annotated video player + canvas overlay
  processing/               -- Scanner rings animation + finding stream
  report/                   -- Risk score, findings, costs, negotiation letter
lib/
  prompts.ts                -- LLM system prompt + Zod schema
  frame-extractor.ts        -- Client-side video frame extraction
  deduplication.ts          -- Merge duplicate findings across frames
  pdf-export.ts             -- PDF report generation
  storage.ts                -- localStorage persistence
  video-storage.ts          -- IndexedDB video persistence
  video-recorder.ts         -- Annotated video export via MediaRecorder
data/
  mock-findings.json        -- Demo mode sample data
  walkthrough-demo.mp4      -- Sample walkthrough video
```

## How Analysis Works

1. Client extracts frames from video every 4 seconds using Canvas API
2. Frames are sent in batches of 6 to `/api/analyze-batch`
3. Gemini analyzes each batch for defects across 8 categories (water damage, structural, electrical, HVAC, roof/ceiling, foundation, plumbing, safety)
4. Findings are deduplicated by category + label across frames
5. Results are saved to localStorage, video to IndexedDB

## Built For

VentureHacks 2026 Hackathon
