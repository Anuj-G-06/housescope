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
