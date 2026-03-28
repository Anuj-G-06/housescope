"use client";

import { motion } from "framer-motion";

interface RiskScoreProps {
  score: number; // 0-100
}

function getRiskLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "High Risk", color: "#ef4444" };
  if (score >= 40) return { label: "Moderate Risk", color: "#f97316" };
  if (score >= 15) return { label: "Low Risk", color: "#eab308" };
  return { label: "Minimal Risk", color: "#22c55e" };
}

export function RiskScore({ score }: RiskScoreProps) {
  const { label, color } = getRiskLabel(score);

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="#EDE8E1"
            strokeWidth="8"
          />
          <motion.circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold font-mono text-[var(--color-text-primary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-[var(--color-text-muted)] uppercase">/ 100</span>
        </div>
      </div>
      <span className="text-lg font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
