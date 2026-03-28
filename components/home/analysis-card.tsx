"use client";

import { Trash2 } from "lucide-react";
import type { SavedAnalysis } from "@/lib/types";

interface AnalysisCardProps {
  analysis: SavedAnalysis;
  onSelect: () => void;
  onDelete: () => void;
}

function getRiskColor(score: number): string {
  if (score >= 70) return "#E05252";
  if (score >= 40) return "#D97B3A";
  if (score >= 15) return "#C4A020";
  return "#22c55e";
}

export function AnalysisCard({ analysis, onSelect, onDelete }: AnalysisCardProps) {
  const { result, address, date, thumbnail } = analysis;
  const riskColor = getRiskColor(result.risk_score);

  return (
    <button
      onClick={onSelect}
      className="relative w-full rounded-xl overflow-hidden text-left group"
      style={{ boxShadow: "0 2px 8px rgba(120,100,80,0.08), 0 8px 32px rgba(120,100,80,0.06)" }}
    >
      <div className="relative aspect-video bg-black">
        <img
          src={thumbnail}
          alt={address}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>

        <div className="absolute bottom-0 inset-x-0 p-3">
          <p className="text-white font-semibold text-sm truncate">{address}</p>
          <p className="text-white/60 text-xs mt-0.5">
            {new Date(date).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: riskColor }}
            >
              {result.risk_score}
            </span>
            <span className="text-white/70 text-xs">
              {result.manifest.length} findings
            </span>
            <span className="text-white/70 text-xs">
              ${result.total_cost_low.toLocaleString()}-${result.total_cost_high.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
