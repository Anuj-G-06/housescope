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
