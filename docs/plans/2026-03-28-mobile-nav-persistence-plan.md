# Mobile Navigation + Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add localStorage persistence, bottom tab bar navigation, and a homepage showing past analyses as visual cards.

**Architecture:** Refactor single-page app from stage-based (`upload|processing|results`) to tab-based (`home|scan|settings`) where scan tab contains the existing stage flow. Add a storage layer using localStorage. Extract a thumbnail during frame extraction for card display.

**Tech Stack:** localStorage, lucide-react icons, existing Tailwind v4 + framer-motion

---

## Task 1: Storage Layer

**Files:**
- Create: `lib/storage.ts`
- Modify: `lib/types.ts`

**Step 1: Add SavedAnalysis type to types.ts**

```typescript
export interface SavedAnalysis {
  id: string;
  address: string;
  date: string;
  thumbnail: string;
  result: AnalysisResult;
}
```

**Step 2: Create storage utility**

Create `lib/storage.ts`:

```typescript
import type { SavedAnalysis } from "./types";

const STORAGE_KEY = "homescope:analyses";
const MAX_ANALYSES = 20;

export function getSavedAnalyses(): SavedAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(analysis: SavedAnalysis): void {
  const existing = getSavedAnalyses();
  const updated = [analysis, ...existing].slice(0, MAX_ANALYSES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteAnalysis(id: string): void {
  const existing = getSavedAnalyses();
  const updated = existing.filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
```

**Step 3: Commit**

```bash
git add lib/storage.ts lib/types.ts
git commit -m "feat: add localStorage persistence layer"
```

---

## Task 2: Thumbnail Extraction

**Files:**
- Modify: `lib/frame-extractor.ts`

**Step 1: Add thumbnail extraction function**

Add to `lib/frame-extractor.ts`:

```typescript
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

  // Seek to 25% into the video for a representative frame
  video.currentTime = video.duration * 0.25;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });

  const canvas = document.createElement("canvas");
  canvas.width = 320; // small thumbnail
  canvas.height = Math.round(320 * (video.videoHeight / video.videoWidth));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.6);
}
```

**Step 2: Commit**

```bash
git add lib/frame-extractor.ts
git commit -m "feat: add thumbnail extraction for saved analyses"
```

---

## Task 3: Bottom Tab Bar Component

**Files:**
- Create: `components/navigation/tab-bar.tsx`

**Step 1: Create the tab bar**

```tsx
"use client";

import { Home, ScanLine, Settings } from "lucide-react";

export type TabId = "home" | "scan" | "settings";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; icon: typeof Home }[] = [
  { id: "home", icon: Home },
  { id: "scan", icon: ScanLine },
  { id: "settings", icon: Settings },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[var(--color-border)] h-14 flex items-center justify-around px-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className="flex items-center justify-center w-12 h-12 rounded-xl transition-colors"
        >
          <Icon
            size={24}
            strokeWidth={activeTab === id ? 2.5 : 1.5}
            className={activeTab === id ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}
          />
        </button>
      ))}
    </nav>
  );
}
```

**Step 2: Commit**

```bash
git add components/navigation/tab-bar.tsx
git commit -m "feat: add bottom tab bar component"
```

---

## Task 4: Homepage with Analysis Cards

**Files:**
- Create: `components/home/home-view.tsx`, `components/home/analysis-card.tsx`

**Step 1: Create analysis card**

Create `components/home/analysis-card.tsx`:

```tsx
"use client";

import { Trash2 } from "lucide-react";
import { SEVERITY_COLORS } from "@/lib/constants";
import type { SavedAnalysis } from "@/lib/types";

interface AnalysisCardProps {
  analysis: SavedAnalysis;
  onSelect: () => void;
  onDelete: () => void;
}

function getRiskColor(score: number): string {
  if (score >= 70) return "#E05252";
  if (score >= 40) return "#D97B3A";
  if (score >= 15) return "#C4A020";
  return "#22c55e";
}

export function AnalysisCard({ analysis, onSelect, onDelete }: AnalysisCardProps) {
  const { result, address, date, thumbnail } = analysis;
  const riskColor = getRiskColor(result.risk_score);

  return (
    <button
      onClick={onSelect}
      className="relative w-full rounded-xl overflow-hidden text-left group"
      style={{ boxShadow: "0 2px 8px rgba(120,100,80,0.08), 0 8px 32px rgba(120,100,80,0.06)" }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black">
        <img
          src={thumbnail}
          alt={address}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <p className="text-white font-semibold text-sm truncate">{address}</p>
          <p className="text-white/60 text-xs mt-0.5">
            {new Date(date).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: riskColor }}
            >
              {result.risk_score}
            </span>
            <span className="text-white/70 text-xs">
              {result.manifest.length} findings
            </span>
            <span className="text-white/70 text-xs">
              ${result.total_cost_low.toLocaleString()}–${result.total_cost_high.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
```

**Step 2: Create home view**

Create `components/home/home-view.tsx`:

```tsx
"use client";

import { ScanLine } from "lucide-react";
import { AnalysisCard } from "./analysis-card";
import type { SavedAnalysis } from "@/lib/types";

interface HomeViewProps {
  analyses: SavedAnalysis[];
  onSelectAnalysis: (analysis: SavedAnalysis) => void;
  onDeleteAnalysis: (id: string) => void;
  onStartScan: () => void;
}

export function HomeView({ analyses, onSelectAnalysis, onDeleteAnalysis, onStartScan }: HomeViewProps) {
  return (
    <div className="px-4 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
          <span className="text-white text-sm font-bold">H</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">HomeScope</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Your Properties</p>
        </div>
      </div>

      {analyses.length === 0 ? (
        /* Empty state */
        <button
          onClick={onStartScan}
          className="w-full flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-[var(--color-primary-bg)] flex items-center justify-center mb-4">
            <ScanLine size={24} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-[var(--color-text-primary)] font-medium">Scan your first property</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Upload a walkthrough video to get started</p>
        </button>
      ) : (
        /* Analysis grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analyses.map((a) => (
            <AnalysisCard
              key={a.id}
              analysis={a}
              onSelect={() => onSelectAnalysis(a)}
              onDelete={() => onDeleteAnalysis(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add components/home/
git commit -m "feat: add homepage with analysis cards and empty state"
```

---

## Task 5: Refactor page.tsx — Wire Everything Together

**Files:**
- Modify: `app/page.tsx`

This is the biggest task. The page needs to:

1. Replace stage-based nav with tab-based nav
2. Add tab bar at the bottom
3. Show HomeView when on home tab
4. Show existing upload/processing/results when on scan tab
5. Auto-save analysis after completion
6. Extract thumbnail during frame extraction
7. Load saved analyses from localStorage on mount
8. Handle selecting a past analysis (show results without video player)
9. Add `pb-16` to all content for bottom tab bar clearance
10. Remove the top navbar (branding moves to home view header)

Key state changes:
```tsx
const [activeTab, setActiveTab] = useState<TabId>("home");
const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
const [thumbnail, setThumbnail] = useState<string>("");

// Load on mount
useEffect(() => {
  setSavedAnalyses(getSavedAnalyses());
}, []);

// After analysis completes, save:
const analysis: SavedAnalysis = {
  id: crypto.randomUUID(),
  address,
  date: new Date().toISOString(),
  thumbnail,
  result,
};
saveAnalysis(analysis);
setSavedAnalyses(getSavedAnalyses());

// Tab change handler:
const handleTabChange = (tab: TabId) => {
  setActiveTab(tab);
  if (tab === "scan" && stage === "results") {
    // Reset for new scan
    setStage("upload");
    setVideoFile(null);
    setAddress("");
    setAnalysisResult(null);
    setLiveFindings([]);
  }
};

// Selecting past analysis:
const handleSelectAnalysis = (a: SavedAnalysis) => {
  setAnalysisResult(a.result);
  setAddress(a.address);
  setVideoFile(null); // no video for past analyses
  setStage("results");
  setActiveTab("scan");
};
```

Render structure:
```tsx
<main className="min-h-screen bg-[var(--color-background)] pb-16">
  {activeTab === "home" && (
    <HomeView
      analyses={savedAnalyses}
      onSelectAnalysis={handleSelectAnalysis}
      onDeleteAnalysis={handleDelete}
      onStartScan={() => { setActiveTab("scan"); setStage("upload"); }}
    />
  )}

  {activeTab === "scan" && (
    <>
      {stage === "upload" && ( /* existing upload UI */ )}
      {stage === "processing" && ( /* existing processing */ )}
      {stage === "results" && ( /* existing results */ )}
    </>
  )}

  {activeTab === "settings" && (
    <div className="px-4 pt-6 pb-20 text-center text-[var(--color-text-muted)]">
      Settings coming soon
    </div>
  )}

  <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
</main>
```

**Step 1: Read current page.tsx and refactor with all the above changes**

**Step 2: Extract thumbnail in handleAnalyze before frame extraction**

```tsx
import { extractThumbnail } from "@/lib/frame-extractor";

// In handleAnalyze, before extractFrames:
const thumb = await extractThumbnail(videoFile);
setThumbnail(thumb);
```

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: refactor to tab-based nav with home, scan, settings"
```

---

## Task 6: Handle Past Analysis Results (No Video)

**Files:**
- Modify: `components/player/annotated-player.tsx`
- Modify: `app/page.tsx` (results section)

When viewing a past analysis, there's no video file. The results should show:
- Skip the video player entirely if no `videoSrc`
- Show findings report, cost breakdown, negotiation letter, downloads as normal
- Add a "Re-scan this property" button that pre-fills the address

Update AnnotatedPlayer to accept optional `videoSrc`:
```tsx
interface AnnotatedPlayerProps {
  videoSrc?: string | null;
  manifest: ManifestEntry[];
}
```

If `videoSrc` is null, show a placeholder: "Video not available — upload again to view annotated playback"

In page.tsx results section, conditionally render AnnotatedPlayer only when videoFile exists.

**Step 1: Implement changes**
**Step 2: Verify compilation**
**Step 3: Commit**

```bash
git add components/player/ app/page.tsx
git commit -m "feat: handle past analysis view without video"
```
