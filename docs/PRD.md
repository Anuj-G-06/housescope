# HouseScope
## AI-Annotated Home Inspection Video Analysis
### Product Requirements Document | VentureHacks 2026 | v3.0

---

## Key Stats

| | | |
|---|---|---|
| **25%** of buyers waive inspection | **$14K** avg. negotiation savings | **$3B+** US inspection market |
| On their biggest purchase ever | When inspection finds issues | Growing 5–8% annually |

---

## 1. Vision & Elevator Pitch

**One-liner:** Record a 60-second walkthrough on your phone. Upload it. HouseScope returns an annotated version of your video — with bounding boxes, labels, and repair costs drawn directly onto every problem it finds — plus a full inspection report and negotiation brief.

### The Problem

Buying a home is the largest financial decision most people will ever make. Yet 25% of buyers in 2024 made offers without a professional inspection — not because they didn't want one, but because the market forced their hand. In competitive bidding situations, requesting an inspection contingency can kill a deal. Buyers are left choosing between winning the house and knowing what they're buying.

Even buyers who get inspections face a timing gap: inspections happen after an offer is accepted, not during the tour phase when buyers are still evaluating homes. By the time a $40,000 foundation issue is discovered, the buyer is already emotionally and financially committed.

### The Solution

HouseScope processes uploaded walkthrough videos through an AI vision pipeline that extracts frames, detects defects, and renders annotated overlays directly onto the video. The output is a new, playback-ready video where every problem is visually marked — bounding boxes, floating labels, severity colors — exactly as it appeared in the original footage. Alongside the annotated video, HouseScope generates a tiered inspection report with repair cost estimates, code references, and a ready-to-use negotiation brief.

### Why Annotated Video (Not Just a Report)

A text report tells you what was found. An annotated video shows you exactly where it is, in context, as you were standing there. This distinction matters:

- **Spatial clarity** — a bounding box on a wall stain is more compelling than "possible water damage in living room"
- **Shareability** — buyers send the annotated video to their agent, partner, or family. A PDF gets forwarded; a video gets watched.
- **Demo power** — playing back a video where defect boxes materialize over real walls is a moment no competitor can replicate
- **No latency problem** — processing happens offline after upload, so analysis quality is never sacrificed for speed

---

## 2. Target Users

| User | Pain Point | How HouseScope Helps |
|------|-----------|-------------------|
| **Home Buyer** | Forced to waive inspections; no visibility into issues during tour phase | Upload the walkthrough they already recorded — get back an annotated video and full report within minutes |
| **Buyer's Agent** | Liability risk advising clients to waive; no tour-phase due diligence tool | Shareable annotated video + professional report demonstrating due diligence without slowing deal velocity |
| **Home Flipper / Investor** | Evaluates dozens of properties per month; full inspection on each is slow and expensive | Fast video triage — upload a walkthrough, get a repair cost summary before committing to a full inspection |

---

## 3. Hackathon Scope — What We're Building

### 3.1 Core Experience — Three Stages

| # | Stage | Description |
|---|-------|-------------|
| **1** | **Upload** | User uploads a walkthrough video (MP4/MOV) recorded on their phone. Simple drag-and-drop or file picker. Address entry for report metadata. Upload kicks off the analysis pipeline. |
| **2** | **AI Processing** | Backend extracts frames every 1–2 seconds, runs LLM vision analysis on each, and maps findings back to source frames with bounding box coordinates. Processing screen with animated progress and live finding previews streaming in as results arrive. |
| **3** | **Annotated Video + Report** | The original video is returned with defect annotations rendered as overlays — colored bounding boxes and floating label cards synced to each relevant timestamp. Below: full inspection report, repair cost breakdown, negotiation brief. |

### 3.2 Feature Breakdown

#### Stage 1 — Upload
- Drag-and-drop or file picker for MP4/MOV, up to 3 minutes
- Address field for property metadata (report header + cost localization)
- Instant client-side video preview before submission
- Upload progress indicator

#### Stage 2 — AI Processing Pipeline
- Frame extraction: sample every 1–2 seconds via FFmpeg (server-side)
- Batch LLM vision calls: send frames in groups of 4–6 to reduce API round trips
- Each frame returns: findings with bounding box coordinates, severity, label, description, repair cost range, code reference
- Finding deduplication: same defect appearing across multiple frames merged into one finding with a time range
- Processing screen: progress bar, frames-analyzed counter, finding cards streaming in as they're confirmed
- Target total processing time: **under 45 seconds** for a 60-second video

#### Stage 3 — Annotated Video Player
- HTML5 video player with Canvas overlay layer
- As video plays, bounding boxes and label cards appear/disappear in sync with their source frame timestamps
- Color coding by severity: **Red** = Critical, **Orange** = High, **Yellow** = Medium, **Blue** = Low
- Each label card: severity icon, issue name, repair cost range
- Findings sidebar: scrollable list of all issues — clicking a finding scrubs video to that timestamp
- "Jump to finding" nav: step through every annotated moment with prev/next arrows

#### Inspection Report (Below Annotated Video)
- Overall risk score (0–100) with animated fill bar and severity label
- Findings grouped by severity — each card expandable with: full description, repair cost range, code reference, video timestamp link
- Total estimated repair cost range with per-category breakdown
- Negotiation summary callout: specific dollar range to request
- One-tap negotiation letter draft — pre-written, editable, ready to send to agent
- PDF export and shareable video link

### 3.3 Annotated Video Rendering — Technical Detail

This is the core technical centerpiece. Exact implementation:

- Server returns a **findings manifest**: JSON array where each entry has `{ timestamp_start, timestamp_end, bbox: {x, y, w, h} as normalized 0–1 coords, severity, label, cost_low, cost_high }`
- A `<canvas>` element is absolutely positioned over the `<video>` element, matching dimensions exactly
- A `requestAnimationFrame` loop reads `video.currentTime` on every render tick
- For each active finding (where `currentTime` falls between `timestamp_start` and `timestamp_end`), the loop draws the bbox and label card onto the canvas
- Coordinates denormalized at render time: `x_px = bbox.x * videoWidth`
- Findings fade in over 200ms when they first appear, fade out over 300ms when they expire
- **No server-side video encoding required** — all annotation rendering is client-side, keeping infrastructure simple and processing fast

### 3.4 The Wow Moment for Demo

1. **Open:** "I toured a house in Pittsburgh last week and recorded this walkthrough on my phone." [Upload 60-second video, tap Analyze]
2. **Processing:** "HouseScope is analyzing every frame." [Progress fills, finding cards stream in: 'Water damage flagged... Electrical violation flagged... Foundation concern flagged...']
3. **Annotated video loads:** Press play. Camera pans across the basement ceiling — a red bounding box materializes over the water stain: **"Active moisture damage — $4K–$9K"**
4. **Pan continues:** Yellow box over an outlet near the sink: **"GFCI violation — NEC 210.8 — $150"**. Orange box on the electrical panel: **"Double-tapped breakers — $800–$2.5K"**
5. **Report:** "4 findings. Total estimated repairs: $11,200–$24,800. Request $15,000–$22,000 before signing."
6. **Letter:** One tap — pre-written negotiation email appears. Ready to send.

The moment the annotated video plays back with boxes materializing over actual walls — that is the demo moment. It looks like the house is being scanned in real time, but it's actually more reliable because every frame was fully analyzed offline.

---

## 4. Technical Architecture

### 4.1 System Overview

```
┌──────────────┐    upload    ┌───────────────────┐   frames   ┌──────────────────┐
│ Video Upload │─────────────▶│ Frame Extraction   │───────────▶│ LLM Vision API   │
│ (drag+drop)  │              │ (FFmpeg API route) │            │ (Claude / GPT-4o)│
└──────────────┘              └───────────────────┘            └────────┬─────────┘
                                                                         │ findings JSON
                                                               ┌─────────▼──────────┐
                                                               │ Finding Deduplication│
                                                               │ + Manifest Builder  │
                                                               └─────────┬──────────┘
                                                                         │ manifest
                                                               ┌─────────▼──────────┐
                                                               │ Annotated Video     │
                                                               │ Player (Canvas)     │
                                                               │ + Inspection Report │
                                                               └────────────────────┘
```

### 4.2 Component Details

| Component | Implementation | Notes |
|-----------|---------------|-------|
| **Frontend** | Next.js + Tailwind CSS | Mobile-first; Vercel deploy in minutes |
| **Video Upload** | Vercel Blob or S3 presigned URL | Client uploads directly to storage |
| **Frame Extraction** | FFmpeg via API route | Extract 1 frame/sec; output as base64 JPEG array |
| **LLM Vision** | Claude Opus or GPT-4o | Batch 4–6 frames per call; structured JSON with bboxes |
| **Finding Deduplication** | Server-side logic | Merge findings with >70% IoU across consecutive frames |
| **Annotated Playback** | HTML5 video + Canvas overlay | Canvas synced to `video.currentTime`; bboxes drawn per manifest |
| **Animations** | Framer Motion + CSS | Finding cards stream in, report reveals, risk score fill |
| **PDF Export** | jsPDF or react-pdf | Client-side from findings state |
| **Hosting** | Vercel + Edge Functions | Zero-config; serverless API routes |

### 4.3 LLM Prompt Strategy (Core IP)

The system prompt is the domain layer that separates HouseScope from a raw API call:

1. **Role:** "You are a licensed home inspector analyzing video frames for defects across 8 categories"
2. **Taxonomy:** 8 issue categories (Water Damage, Structural, Electrical, HVAC, Roof/Ceiling, Foundation, Plumbing, Safety) with sub-types, severity definitions, and NEC/IRC code references
3. **Bounding box output:** Normalized coordinates (x, y, w, h as 0.0–1.0 fractions of frame dimensions)
4. **Cost database:** Repair cost ranges by category, calibrated to Pittsburgh/mid-Atlantic for demo; zip-localizable post-launch
5. **Conservative thresholds:** Only return findings above 75% confidence
6. **Strict JSON schema:** No prose, no markdown — machine-parseable output only

```json
// Example LLM Response Schema (per frame batch)
{
  "frame_findings": [
    {
      "frame_index": 12,
      "findings": [
        {
          "id": "f1",
          "category": "water_damage",
          "severity": "critical",
          "label": "Active moisture damage",
          "description": "Brown ring staining on ceiling consistent with active or recurring roof/plumbing leak",
          "bbox": { "x": 0.22, "y": 0.14, "w": 0.36, "h": 0.26 },
          "repair_cost_low": 4000,
          "repair_cost_high": 9000,
          "code_reference": null,
          "confidence": 0.89
        }
      ]
    }
  ]
}
```

---

## 5. Hackathon Timeline (4-Hour Sprint)

| Time | Frontend / Engineering | AI / Data |
|------|----------------------|-----------|
| **0:00–0:30** | Scaffold Next.js app, Tailwind, Vercel deploy. Build upload screen with drag-and-drop and address field. | Source 2–3 demo walkthrough videos with clear, identifiable defects. Pre-run analysis to know exactly what the demo will show. |
| **0:30–1:15** | Build server-side frame extraction via FFmpeg API route. Confirm base64 frame array output. Set up Vercel Blob for video storage. | Engineer LLM system prompt + JSON schema with bbox output. Test on 6–8 static frames. Iterate until coordinates are spatially accurate. |
| **1:15–2:00** | Build processing screen: progress bar, frames-analyzed counter, streaming finding cards. | Build issue taxonomy, severity weights, repair cost ranges. Build finding deduplication logic (merge same defect across consecutive frames). |
| **2:00–2:45** | Build annotated video player: Canvas overlay, `requestAnimationFrame` loop, bbox rendering, label cards, findings sidebar. | Wire full pipeline: upload → frame extraction → batched LLM calls → findings manifest → return to frontend. End-to-end test. |
| **2:45–3:15** | Build inspection report: risk score, findings cards with timestamps, cost breakdown, negotiation callout. Negotiation letter. PDF export. | Stress test: different video lengths, lighting, fast panning. Tune confidence threshold. Confirm demo video produces clean output. |
| **3:15–3:45** | Polish: animations, loading states, mobile layout, sharing link. | Write demo script. Prepare judge Q&A. Talking points on market + regulatory tailwind. |
| **3:45–4:00** | **Rehearse demo together — full upload-to-annotated-video flow** | **Rehearse demo together** |

---

## 6. Demo Script (2 Minutes)

1. **Open (15s):** "25% of homebuyers last year made offers with zero knowledge of what was wrong with the house. The market forced them to skip inspections. We built HouseScope to change that — starting with the video you already recorded on your phone."

2. **Upload (15s):** "Here's a 60-second walkthrough I recorded at a house in Pittsburgh last week." [Drag video into upload area, tap Analyze]

3. **Processing (20s):** "HouseScope is now analyzing every frame — extracting defects, mapping their locations, estimating repair costs." [Progress bar fills, finding cards stream in live]

4. **Annotated video (40s):** "Here's what makes HouseScope different." [Press play — red box appears over water stain: 'Active moisture damage — $4K–$9K'. Yellow box over outlet: 'GFCI violation — NEC 210.8 — $150'. Orange box on panel: 'Double-tapped breakers — $800–$2.5K'.] "The defects are drawn directly onto your footage, at the exact moment you were looking at them."

5. **Report (15s):** "4 findings. Total estimated repairs: $11,200–$24,800. Request $15,000–$22,000 before signing."

6. **Negotiation letter (5s):** [One tap] "Pre-written negotiation email. Address it to your agent. Hit send."

7. **Close (10s):** "60-second video. 45-second analysis. The most important $500 you never spent."

---

## 7. Market & Investor Narrative

### Market Size

| TAM | SAM | SOM (Year 1) |
|-----|-----|--------------|
| **$3B+** | **~1.25M buyers** | **$5M+** |
| US home inspection market | Who waived inspections in 2024 | 50K reports @ $10–$20/report |

### Why Now
- 25% of buyers waived inspections in 2024 — up every year since 2020 (NAR data)
- Massachusetts passed Right to Inspection law in 2024; New York bill in committee — regulatory tailwind
- Vision LLMs now reliable enough for spatial defect detection on real-world video
- Buyers already record walkthroughs on their phones — zero behavior change required
- No competitor doing AI-annotated video analysis for home buyers — open category

### Why This Isn't Just ChatGPT

| Layer | What HouseScope Adds Over a Raw LLM |
|-------|-----------------------------------|
| **Inspection taxonomy** | Domain-specific defect classification on ASHI standards and NEC/IRC codes |
| **Bounding box schema** | Structured output that enables video annotation — no raw model produces this |
| **Regional cost database** | Repair estimates calibrated by zip code, not generic national averages |
| **Finding deduplication** | Same defect across multiple frames merged into one coherent finding with a time range |
| **Negotiation logic** | Converts findings into a specific dollar ask based on real estate norms |
| **Data flywheel** | Every scan generates labeled defect video data — proprietary dataset that compounds |

### Competitive Landscape

| Competitor | Gap HouseScope Fills |
|-----------|-------------------|
| Professional inspectors ($400–$500, post-offer, 3–4 hours) | HouseScope works during tour phase, costs $10–$20, takes 45 seconds |
| iRoofing / Hover (exterior photo analysis) | Interior-first, video-native, annotated playback vs. static photo |
| ChatGPT / Claude with photo upload | No video, no bounding boxes, no annotated playback, no structured report, no negotiation output |
| **No direct competitor** | First product doing AI-annotated video analysis for home buyers |

### Revenue Model
- **Pay-per-report:** $10–$20 per video analysis (consumer)
- **Agent subscription:** $99/month unlimited analyses + white-label report branding
- **Investor/flipper tier:** $299/month portfolio dashboard, bulk upload, API access

---

## 8. Handling Tough Judge Questions

| Question | Answer |
|----------|--------|
| **"Is this just ChatGPT with a video?"** | Any LLM can say 'that might be water damage.' HouseScope adds a spatial bounding box schema enabling video annotation, a regional cost database, an ASHI/NEC inspection taxonomy, finding deduplication across frames, and a negotiation output. The model is a commodity. Every layer on top is the product. |
| **"How accurate is it?"** | HouseScope is a triage tool, not a licensed inspection replacement — same as WebMD vs. a doctor. Conservative by design: only flag above 75% confidence. For the demo, we pre-validated output on our test video. Post-launch, accuracy improves through the data flywheel. |
| **"What about liability?"** | Every report includes a disclaimer: AI-assisted triage, not a licensed inspection. Same legal framing as any property information tool. The risk of *not* having HouseScope — buying a house with a $40K issue you walked past — is far greater. |
| **"What stops Zillow from copying this?"** | Nothing immediately — but HouseScope's labeled defect dataset by region becomes a moat over time. We also move faster. Zillow takes 18 months to ship a feature; we shipped this in 4 hours. |
| **"Why pay when you can use ChatGPT?"** | ChatGPT doesn't support video. It doesn't return bounding boxes. It doesn't produce an annotated video you can play back. It doesn't give you a negotiation letter. HouseScope is a workflow, not a chat prompt. |

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Upload-to-annotated-video latency | < 45 seconds for a 60-second walkthrough video |
| Bounding box accuracy (demo) | All annotated boxes align correctly to actual defects on screen |
| False positive rate (demo) | Zero incorrect annotations during the 2-minute demo |
| Pipeline completeness | Upload → frames → LLM → manifest → annotated playback → report → PDF all functional |
| Wow factor | At least one judge asks "how did you build this in 4 hours" |
| Pitch clarity | 2-minute demo tells complete arc: problem → annotated video → report → market |

---

## 10. Post-Hackathon Roadmap

| Timeline | Milestone |
|----------|-----------|
| **Week 1–2** | Public beta. Target buyer's agent communities (Reddit, ActiveRain, Facebook Groups). Collect 500 real walkthrough videos for model fine-tuning. |
| **Week 3–4** | Agent subscription tier. Outreach to 10–15 Pittsburgh buyer's agents for paid pilots via CMU real estate network. |
| **Month 2** | Localized cost database expansion. MLS integration to auto-populate property address and listing price at upload. |
| **Month 3** | Native iOS/Android app for faster upload and better video quality. Audio analysis layer — dripping sounds, HVAC noise, structural creaks. |
| **Month 4** | Pilot with 2–3 regional brokerages. Home warranty and insurance partnerships (annotated defect data has direct underwriting value). |
| **Month 6** | Expand to commercial pre-inspection. API for Redfin/Zillow listing page integration — "Analyze this home" button. |

---

*Built for speed. Designed to impress. Engineered to become a company.*