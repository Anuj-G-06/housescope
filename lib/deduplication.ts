import { FINDING_DISPLAY_DURATION } from "./constants";
import type { Finding, ManifestEntry } from "./types";

export function deduplicateFindings(findings: Finding[]): ManifestEntry[] {
  const sorted = [...findings].sort((a, b) => a.timestamp - b.timestamp);
  const merged: ManifestEntry[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;

    const base = sorted[i];
    let timestampEnd = base.timestamp + FINDING_DISPLAY_DURATION;
    let bestConfidence = base.confidence;

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const candidate = sorted[j];

      // Merge by same category + same label (same defect across frames)
      if (
        candidate.category === base.category &&
        candidate.label === base.label
      ) {
        used.add(j);
        timestampEnd = candidate.timestamp + FINDING_DISPLAY_DURATION;
        if (candidate.confidence > bestConfidence) {
          bestConfidence = candidate.confidence;
        }
      }
    }

    merged.push({
      id: base.id,
      category: base.category,
      severity: base.severity,
      label: base.label,
      description: base.description,
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
