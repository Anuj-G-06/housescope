# Mobile Navigation + Persistence Design

## Summary

Add localStorage persistence for analysis results, a bottom tab bar for mobile-app navigation, and a homepage showing past analyses as visual cards.

## 1. Data Persistence (localStorage)

```typescript
interface SavedAnalysis {
  id: string;              // uuid
  address: string;
  date: string;            // ISO timestamp
  thumbnail: string;       // base64 JPEG from first frame
  result: AnalysisResult;  // manifest, risk_score, costs
}
```

- Key: `"homescope:analyses"`
- Thumbnail extracted during frame extraction (frame 0)
- Video file NOT persisted (too large) — user re-uploads for overlay playback
- Max 20 analyses, auto-evict oldest

## 2. Bottom Tab Bar

Three icon-only tabs (lucide-react), fixed bottom, 56px:

| Tab | Icon | View |
|-----|------|------|
| Home | `Home` | Past analyses grid |
| Scan | `ScanLine` | Upload → Processing → Results |
| Settings | `Settings` | Placeholder |

- Active: primary color. Inactive: muted
- Processing/results happen within Scan tab
- After analysis completes, auto-save to localStorage
- Flow: `home → scan:upload → scan:processing → scan:results → home`

## 3. Homepage — Past Analyses Grid

- Vertical scrolling cards, single column mobile, 2-col desktop
- Card: video thumbnail bg (dimmed) + bottom overlay with address, date, risk badge, finding count, cost range
- Tap → loads analysis into results view
- Swipe left or long-press to delete
- Empty state: scan icon + "Scan your first property"
- Header: "HomeScope" branding + "Your Properties" subtitle
