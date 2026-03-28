"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SEVERITY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import type { ManifestEntry } from "@/lib/types";

interface FindingsSidebarProps {
  manifest: ManifestEntry[];
  activeIds: string[];
  onSeek: (timestamp: number) => void;
}

export function FindingsSidebar({ manifest, activeIds, onSeek }: FindingsSidebarProps) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 p-1">
        {manifest.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSeek(entry.timestamp_start)}
            className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
              activeIds.includes(entry.id)
                ? "border-primary bg-accent"
                : "border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: SEVERITY_COLORS[entry.severity] }}
              />
              <span className="font-medium text-sm">{entry.label}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {CATEGORY_LABELS[entry.category]}
              </Badge>
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
    </ScrollArea>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
