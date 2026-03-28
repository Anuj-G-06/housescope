"use client";

import { Progress } from "@/components/ui/progress";
import { FindingCard } from "./finding-card";
import type { Finding } from "@/lib/types";

interface ProcessingScreenProps {
  progress: number; // 0-100
  framesAnalyzed: number;
  totalFrames: number;
  findings: Finding[];
  statusText: string;
}

export function ProcessingScreen({
  progress,
  framesAnalyzed,
  totalFrames,
  findings,
  statusText,
}: ProcessingScreenProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Analyzing Your Property</h2>
        <p className="text-muted-foreground">{statusText}</p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{framesAnalyzed} / {totalFrames} frames analyzed</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {findings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Findings
          </h3>
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}
