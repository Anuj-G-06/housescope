"use client";

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
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Estimated Repair Costs</h3>

      <div className="space-y-2">
        {Object.entries(byCategory).map(([cat, costs]) => (
          <div key={cat} className="flex justify-between text-sm">
            <span className="text-[var(--color-text-primary)]">
              {CATEGORY_LABELS[cat as Category]}{" "}
              <span className="text-[var(--color-text-muted)]">({costs.count})</span>
            </span>
            <span className="font-mono text-[var(--color-text-primary)]">
              ${costs.low.toLocaleString()} – ${costs.high.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--color-border)]" />

      <div className="flex justify-between font-semibold text-[var(--color-text-primary)]">
        <span>Total Estimated Range</span>
        <span className="font-mono">
          ${totalCostLow.toLocaleString()} – ${totalCostHigh.toLocaleString()}
        </span>
      </div>

      <div className="bg-[var(--color-primary-bg)] border border-[var(--color-primary)]/20 rounded-xl p-4 mt-4">
        <p className="text-sm font-medium text-[var(--color-primary-dark)]">Negotiation Recommendation</p>
        <p className="text-2xl font-bold mt-1 text-[var(--color-text-primary)]">
          Request ${negotiationLow.toLocaleString()} – ${negotiationHigh.toLocaleString()}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Based on 70–85% of estimated repair costs — standard negotiation range
        </p>
      </div>
    </div>
  );
}
