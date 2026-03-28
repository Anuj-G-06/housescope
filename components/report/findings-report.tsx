"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS[severity] }}
              />
              {severityLabel[severity]} ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((entry) => (
                <Card
                  key={entry.id}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() =>
                    setExpanded(expanded === entry.id ? null : entry.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium">{entry.label}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[entry.category]}
                        </Badge>
                        {entry.code_reference && (
                          <Badge variant="secondary" className="text-xs font-mono">
                            {entry.code_reference}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-mono whitespace-nowrap">
                      ${entry.repair_cost_low.toLocaleString()}–$
                      {entry.repair_cost_high.toLocaleString()}
                    </span>
                  </div>

                  {expanded === entry.id && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground space-y-2">
                      <p>{entry.description}</p>
                      <button
                        className="text-primary hover:underline text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(entry.timestamp_start);
                        }}
                      >
                        Jump to video timestamp &rarr;
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
