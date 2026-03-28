"use client";

import { useState } from "react";
import { SEVERITY_COLORS, CATEGORY_LABELS, SEVERITY_ORDER } from "@/lib/constants";
import type { ManifestEntry, Severity } from "@/lib/types";

interface FindingsReportProps {
  manifest: ManifestEntry[];
  onSeek: (timestamp: number) => void;
}

export function FindingsReport({ manifest, onSeek }: FindingsReportProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const grouped = SEVERITY_ORDER.reduce(
    (acc, severity) => {
      const items = manifest.filter((f) => f.severity === severity);
      if (items.length > 0) acc[severity] = items;
      return acc;
    },
    {} as Record<Severity, ManifestEntry[]>
  );

  const severityLabel: Record<Severity, string> = {
    critical: "Critical Issues",
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
  };

  return (
    <div className="space-y-6">
      {SEVERITY_ORDER.map((severity) => {
        const items = grouped[severity];
        if (!items) return null;

        return (
          <div key={severity}>
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3 text-[var(--color-text-primary)]">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[severity] }}
              />
              {severityLabel[severity]} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border border-[var(--color-border)] rounded-xl p-4 cursor-pointer hover:bg-[var(--color-primary-bg)]/50 transition-colors"
                  style={{ boxShadow: '0 1px 3px rgba(120,100,80,0.06)' }}
                  onClick={() =>
                    setExpanded(expanded === entry.id ? null : entry.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">{entry.label}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-secondary)]">
                          {CATEGORY_LABELS[entry.category]}
                        </span>
                        {entry.code_reference && (
                          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-bg)] text-[var(--color-primary-dark)] font-mono">
                            {entry.code_reference}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[var(--color-text-primary)] font-mono whitespace-nowrap">
                      ${entry.repair_cost_low.toLocaleString()}–$
                      {entry.repair_cost_high.toLocaleString()}
                    </span>
                  </div>

                  {expanded === entry.id && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] space-y-2">
                      <p>{entry.description}</p>
                      <button
                        className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(entry.timestamp_start);
                        }}
                      >
                        Jump to video timestamp &rarr;
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
