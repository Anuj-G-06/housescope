"use client";

import { SEVERITY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import type { ManifestEntry } from "@/lib/types";

interface FindingsSidebarProps {
  manifest: ManifestEntry[];
  activeIds: string[];
  onSeek: (timestamp: number) => void;
}

export function FindingsSidebar({ manifest, activeIds, onSeek }: FindingsSidebarProps) {
  return (
    <div className="overflow-y-auto max-h-[400px]">
      <div className="space-y-2 p-1">
        {manifest.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSeek(entry.timestamp_start)}
            className={`w-full text-left rounded-xl border p-3 transition-colors bg-white hover:bg-[var(--color-primary-bg)]/50 ${
              activeIds.includes(entry.id)
                ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                : "border-[var(--color-border)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[entry.severity] }}
              />
              <span className="font-medium text-sm text-[var(--color-text-primary)]">{entry.label}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)]">
                {CATEGORY_LABELS[entry.category]}
              </span>
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
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
