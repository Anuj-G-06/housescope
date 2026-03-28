"use client";

import { SEVERITY_COLORS } from "@/lib/constants";
import type { ManifestEntry } from "@/lib/types";

interface FindingsSidebarProps {
  manifest: ManifestEntry[];
  activeIds: string[];
  onSeek: (timestamp: number) => void;
}

export function FindingsSidebar({ manifest, activeIds, onSeek }: FindingsSidebarProps) {
  return (
    <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto p-1">
      {manifest.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onSeek(entry.timestamp_start)}
          className={`shrink-0 lg:shrink text-left rounded-xl border p-2.5 transition-colors bg-white hover:bg-[var(--color-primary-bg)]/50 lg:w-full ${
            activeIds.includes(entry.id)
              ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
              : "border-[var(--color-border)]"
          }`}
          style={{ minWidth: "160px" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: SEVERITY_COLORS[entry.severity] }}
            />
            <span className="font-medium text-xs text-[var(--color-text-primary)] truncate">{entry.label}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
            <span>{formatTimestamp(entry.timestamp_start)}</span>
            <span>${entry.repair_cost_low.toLocaleString()}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
