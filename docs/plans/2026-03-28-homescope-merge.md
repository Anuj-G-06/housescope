# HouseScope Merge + Gemini Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge cursor branch's polished UI/design into Claude branch's working backend, switch LLM to Gemini, and add demo mode with mock data.

**Architecture:** Keep feat/housescope's single-page architecture and full backend. Port cursor's warm cream color palette, animations (scanner rings, spring transitions), corner-accent Canvas rendering, and NegotiationModal. Add a demo mode that uses mock data when no API key is configured. Switch AI provider from Anthropic to Google Gemini via AI Gateway.

**Tech Stack:** Same as before + lucide-react (icons), cursor's color palette, Google Gemini via AI Gateway

---

## Task 1: Install Dependencies + Port Design System

**Files:**
- Modify: `package.json` (add lucide-react)
- Modify: `app/globals.css` (port cursor's color palette as CSS variables)
- Modify: `app/layout.tsx` (switch to Inter font, light mode base)

**Step 1: Install lucide-react**

Run: `npm install lucide-react`

**Step 2: Replace app/globals.css with merged design system**

Keep Tailwind v4 `@import` syntax but add cursor's color palette as CSS custom properties and global styles:

```css
@import "tailwindcss";
@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: #F7F4EF;
  --color-foreground: #1C1917;
  --color-surface: #FDFBF7;
  --color-card: #FFFFFF;
  --color-card-foreground: #1C1917;
  --color-border: #E8E0D5;
  --color-input: #E8E0D5;
  --color-ring: #7BB8D4;
  --color-primary: #7BB8D4;
  --color-primary-dark: #5A9BB8;
  --color-primary-light: #A8D4E8;
  --color-primary-bg: #F0F8FC;
  --color-primary-foreground: #FFFFFF;
  --color-secondary: #F0F8FC;
  --color-secondary-foreground: #5A9BB8;
  --color-muted: #EDE8E1;
  --color-muted-foreground: #A8A29E;
  --color-accent: #F0F8FC;
  --color-accent-foreground: #5A9BB8;
  --color-destructive: #E05252;
  --color-destructive-foreground: #FFFFFF;
  --color-text-primary: #1C1917;
  --color-text-secondary: #78716C;
  --color-text-muted: #A8A29E;
  --color-severity-critical: #E05252;
  --color-severity-high: #D97B3A;
  --color-severity-medium: #C4A020;
  --color-severity-low: #5A9BB8;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  -webkit-font-smoothing: antialiased;
}

.tabular {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #E8E0D5; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #7BB8D4; }
::selection { background: rgba(123, 184, 212, 0.2); color: #1C1917; }
```

**Step 3: Update layout.tsx — switch to light mode with Inter font**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HouseScope — AI Home Inspection",
  description: "Upload a walkthrough video. Get an annotated inspection report in 45 seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
```

**Step 4: Update lib/constants.ts severity colors to match cursor palette**

Replace the SEVERITY_COLORS values:
```typescript
export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#E05252",
  high: "#D97B3A",
  medium: "#C4A020",
  low: "#5A9BB8",
};
```

**Step 5: Commit**

```bash
git add -A
git commit -m "design: port cursor's warm cream palette and design system"
```

---

## Task 2: Add Mock Data + Demo Mode

**Files:**
- Create: `data/mock-findings.json`
- Create: `lib/demo-mode.ts`

**Step 1: Create mock data from cursor branch**

Create `data/mock-findings.json` — copy the exact JSON from the cursor branch (the 4 findings: water damage, double-tapped breakers, foundation efflorescence, missing GFCI).

**Step 2: Create demo mode utility**

Create `lib/demo-mode.ts`:

```typescript
import type { ManifestEntry, AnalysisResult } from "./types";
import mockData from "@/data/mock-findings.json";

export function isDemoMode(): boolean {
  return !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN;
}

export function getMockAnalysisResult(): AnalysisResult {
  const manifest: ManifestEntry[] = mockData.findings.map((f) => ({
    id: f.id,
    category: f.category as ManifestEntry["category"],
    severity: f.severity as ManifestEntry["severity"],
    label: f.label,
    description: f.description,
    bbox: f.bbox,
    repair_cost_low: f.repair_cost_low,
    repair_cost_high: f.repair_cost_high,
    code_reference: f.code_reference,
    confidence: f.confidence,
    timestamp_start: f.timestamp_start,
    timestamp_end: f.timestamp_end,
  }));

  return {
    manifest,
    risk_score: mockData.summary.overall_risk_score,
    total_cost_low: mockData.summary.total_cost_low,
    total_cost_high: mockData.summary.total_cost_high,
  };
}
```

**Step 3: Add demo mode API route**

Create `app/api/demo-status/route.ts`:

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const isDemo = !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN;
  return NextResponse.json({ demo: isDemo });
}
```

**Step 4: Update analyze-batch route to return mock data in demo mode**

At the top of `app/api/analyze-batch/route.ts`, before the AI call:

```typescript
import mockData from "@/data/mock-findings.json";

// Inside POST handler, before the generateText call:
const isDemo = !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN;
if (isDemo) {
  // Return mock findings for the batch with a simulated delay
  await new Promise((r) => setTimeout(r, 1500));
  const batchFindings = mockData.findings
    .filter((f) => {
      // Map mock findings to the batch's frame timestamps
      return frames.some((fr) => Math.abs(fr.timestamp - f.timestamp_start) < 4);
    })
    .map((f) => ({
      ...f,
      frame_index: frames[0].index,
      timestamp: f.timestamp_start,
      category: f.category as Finding["category"],
      severity: f.severity as Finding["severity"],
    }));
  return NextResponse.json({ findings: batchFindings });
}
```

**Step 5: Commit**

```bash
git add data/ lib/demo-mode.ts app/api/demo-status/ app/api/analyze-batch/route.ts
git commit -m "feat: add mock data and demo mode for API-free demos"
```

---

## Task 3: Redesign Upload Page with Cursor's Hero Layout

**Files:**
- Modify: `app/page.tsx` (upload stage)
- Modify: `components/upload/dropzone.tsx`

**Step 1: Redesign the upload stage in page.tsx**

Replace the upload stage with cursor's hero layout pattern — pill badge, large headline, subheadline, stats row, card-style upload area. Use Framer Motion for staggered fade-in animations. Use lucide-react icons (Upload, CheckCircle, Home).

Key design elements from cursor:
- Fixed navbar: `bg-surface/80 backdrop-blur-md border-b border-border`
- Pill badge: `border border-primary/40 bg-primary-bg text-primary-dark rounded-full`
- Headline: split into primary + secondary color
- Stats row: `bg-white border border-border rounded-full shadow-warm`
- Upload card: `bg-white border border-border rounded-2xl p-8 shadow-warm-lg`
- Drop zone with icon: `Upload` from lucide-react in a `bg-primary-bg` circle
- File selected state: green pill with `CheckCircle` icon
- Submit button: `bg-primary text-white hover:bg-primary-dark hover:shadow-[0_4px_20px_rgba(123,184,212,0.4)]`

**Step 2: Redesign the dropzone component**

Replace shadcn Card-based dropzone with cursor's clean drop zone style — no Card wrapper, just dashed border with primary hover states.

**Step 3: Verify it renders**

Run: `npm run dev`

**Step 4: Commit**

```bash
git add app/page.tsx components/upload/
git commit -m "design: redesign upload page with cursor's hero layout"
```

---

## Task 4: Port Cursor's Processing Animation

**Files:**
- Modify: `components/processing/processing-screen.tsx`

**Step 1: Replace processing screen with cursor's scanner rings design**

Key elements to port:
- Full-screen centered layout with `bg-base`
- Radial gradient background: `radial-gradient(ellipse 60% 60% at 50% 50%, rgba(123,184,212,0.08) 0%, transparent 70%)`
- 4 concentric scanner rings with increasing opacity decay, pulsing via framer-motion
- Home icon in center (`lucide-react`)
- Animated ellipsis on status text
- Gradient progress bar: `bg-gradient-to-r from-[#7BB8D4] to-[#A8D4E8]`
- Spring-animated finding cards sliding in from right
- Flash effect on completion

Keep the real progress/findings props — don't use fake timers like cursor does.

**Step 2: Commit**

```bash
git add components/processing/
git commit -m "design: port cursor's scanner rings processing animation"
```

---

## Task 5: Port Cursor's Canvas Overlay Style

**Files:**
- Modify: `components/player/canvas-overlay.tsx`

**Step 1: Replace bounding box rendering with cursor's corner accent style**

Instead of full stroke rectangles, use cursor's corner accent approach:
- Draw L-shaped corner accents at each corner of the bbox (4 corners)
- Use a pill-shaped label card instead of rectangular
- Add a severity-colored dot in the label pill
- Use Inter font for labels
- Use `smoothstep` easing for fade instead of linear
- Keep our existing `prevActiveIdsRef` optimization

**Step 2: Commit**

```bash
git add components/player/canvas-overlay.tsx
git commit -m "design: port cursor's corner-accent bounding box style"
```

---

## Task 6: Restyle Results Page Components

**Files:**
- Modify: `components/report/risk-score.tsx`
- Modify: `components/report/findings-report.tsx`
- Modify: `components/report/cost-breakdown.tsx`
- Modify: `components/report/negotiation-brief.tsx`
- Modify: `components/player/findings-sidebar.tsx`
- Modify: `app/page.tsx` (results stage)

**Step 1: Update all report components to use warm cream styling**

Replace dark-mode shadcn styling with cursor's warm palette:
- Cards: `bg-white border border-border rounded-xl shadow-warm` instead of shadcn Card
- Badges: custom styled `bg-[color]/10 border-[color]/25 text-[color] rounded-full`
- Fonts: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- Buttons: `bg-primary text-white rounded-xl hover:bg-primary-dark`
- Separators: `border-border`

**Step 2: Replace NegotiationBrief with cursor's modal pattern**

Replace inline textarea with a button that opens cursor's NegotiationModal (slide-up modal with letter, copy button with checkmark animation).

**Step 3: Update results stage header in page.tsx**

Use cursor's navbar style: `bg-surface/80 backdrop-blur-md`

**Step 4: Commit**

```bash
git add components/ app/page.tsx
git commit -m "design: restyle all results components with warm cream palette"
```

---

## Task 7: Switch to Gemini API

**Files:**
- Modify: `app/api/analyze-batch/route.ts`
- Modify: `lib/prompts.ts`

**Step 1: Update model string to Gemini**

In `app/api/analyze-batch/route.ts`, change:
```typescript
model: "anthropic/claude-sonnet-4.5",
```
to:
```typescript
model: "google/gemini-2.5-flash",
```

> **Before coding:** Verify the latest Gemini model ID:
> ```bash
> curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '[.data[] | select(.id | startswith("google/")) | .id] | reverse | .[]'
> ```

**Step 2: Adjust prompt for Gemini compatibility**

Gemini models handle vision differently — ensure the prompt works. The structured output via `Output.object()` should work the same way through AI Gateway. May need to adjust the system prompt to be more explicit about JSON output format since Gemini can be chattier.

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add app/api/analyze-batch/route.ts lib/prompts.ts
git commit -m "feat: switch AI model from Anthropic to Google Gemini"
```

---

## Task 8: Final Integration + Build Verification

**Files:**
- Modify: `app/page.tsx` (final cleanup)

**Step 1: Remove unused imports and dead code**

Clean up any unused shadcn imports, old dark mode references, etc.

**Step 2: Run typecheck**

Run: `npx tsc --noEmit`

**Step 3: Run tests**

Run: `npx vitest run`

**Step 4: Run build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: final cleanup and build verification"
```

---

## Summary of What Changes

| From (Claude branch) | To (Merged) |
|----------------------|-------------|
| Dark mode (shadcn default) | Warm cream light mode (cursor palette) |
| Plain shadcn cards | White cards with warm shadows |
| Simple progress bar | Scanner rings + gradient bar |
| Rectangular bounding boxes | Corner accent bounding boxes |
| Inline negotiation textarea | Modal with copy animation |
| Anthropic Claude model | Google Gemini model |
| No demo mode | Mock data fallback when no API key |
| No icons | lucide-react icons throughout |
