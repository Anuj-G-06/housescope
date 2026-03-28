"use client";

import { ScanLine, Home } from "lucide-react";
import { AnalysisCard } from "./analysis-card";
import type { SavedAnalysis } from "@/lib/types";

interface HomeViewProps {
  analyses: SavedAnalysis[];
  onSelectAnalysis: (analysis: SavedAnalysis) => void;
  onDeleteAnalysis: (id: string) => void;
  onStartScan: () => void;
}

export function HomeView({ analyses, onSelectAnalysis, onDeleteAnalysis, onStartScan }: HomeViewProps) {
  return (
    <div className="px-4 pt-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
          <Home size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">HouseScope</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Your Properties</p>
        </div>
      </div>

      {analyses.length === 0 ? (
        <button
          onClick={onStartScan}
          className="w-full flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-[var(--color-primary-bg)] flex items-center justify-center mb-4">
            <ScanLine size={24} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-[var(--color-text-primary)] font-medium">Scan your first property</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Upload a walkthrough video to get started</p>
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analyses.map((a) => (
            <AnalysisCard
              key={a.id}
              analysis={a}
              onSelect={() => onSelectAnalysis(a)}
              onDelete={() => onDeleteAnalysis(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
