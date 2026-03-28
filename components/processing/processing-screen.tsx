"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Home } from "lucide-react";
import { SEVERITY_COLORS } from "@/lib/constants";
import type { Finding } from "@/lib/types";

interface ProcessingScreenProps {
  progress: number; // 0-100
  framesAnalyzed: number;
  totalFrames: number;
  findings: Finding[];
  statusText: string;
}

function AnimatedEllipsis() {
  return (
    <span className="inline-flex w-6 ml-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="text-[var(--color-text-primary)]"
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut" as const,
          }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

const rings = [
  {
    size: "w-16 h-16",
    border: "border-2 border-[#7BB8D4]",
    pulse: undefined,
  },
  {
    size: "w-32 h-32",
    border: "border border-[#7BB8D4]/50",
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
    },
  },
  {
    size: "w-52 h-52",
    border: "border border-[#7BB8D4]/25",
    pulse: {
      scale: [1, 1.08, 1],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
    },
  },
  {
    size: "w-72 h-72",
    border: "border border-[#7BB8D4]/12",
    pulse: {
      scale: [1, 1.1, 1],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
    },
  },
];

export function ProcessingScreen({
  progress,
  framesAnalyzed,
  totalFrames,
  findings,
  statusText,
}: ProcessingScreenProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      {/* Radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(123,184,212,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Scanner rings */}
      <div className="relative flex items-center justify-center w-72 h-72 z-10">
        {rings.map((ring, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${ring.size} ${ring.border}`}
            animate={ring.pulse}
          />
        ))}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--color-primary-bg)" }}
        >
          <Home size={20} className="text-[#7BB8D4]" strokeWidth={1.5} />
        </div>
      </div>

      {/* Status text */}
      <div className="mt-16 text-center z-10">
        <h2 className="text-[var(--color-text-primary)] text-2xl font-semibold inline-flex items-center">
          {statusText}
          <AnimatedEllipsis />
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm mt-2">
          Scanning frame {framesAnalyzed} of {totalFrames}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-8 w-full max-w-sm px-4 z-10">
        <div className="bg-[#EDE8E1] rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#7BB8D4] to-[#A8D4E8]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[var(--color-text-muted)] text-xs text-right mt-1.5 tabular-nums">
          {Math.round(progress)}% complete
        </p>
      </div>

      {/* Finding cards */}
      <div className="mt-10 w-full max-w-md px-4 z-10">
        <p className="text-[var(--color-text-secondary)] text-sm font-medium mb-3">
          Findings discovered
        </p>
        <div className="space-y-2 max-h-52 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {findings.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="flex items-center justify-between bg-white border border-[var(--color-border)] rounded-xl px-4 py-3"
                style={{
                  boxShadow:
                    "0 1px 3px rgba(120,100,80,0.06), 0 4px 16px rgba(120,100,80,0.04)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: SEVERITY_COLORS[f.severity] }}
                  />
                  <span className="text-[var(--color-text-primary)] text-sm font-medium">
                    {f.label}
                  </span>
                </div>
                <span className="text-[var(--color-primary-dark)] text-sm font-bold tabular-nums whitespace-nowrap ml-4">
                  ${f.repair_cost_low.toLocaleString()}&ndash;$
                  {f.repair_cost_high.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
