"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import findings from "@/data/mock-findings.json";

const TOTAL_FRAMES = 47;
const FRAME_INTERVAL_MS = 800;
const DURATION_S = 28;
const FINDING_INTERVAL_MS = 5000;

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#F43F5E",
  high: "#FB923C",
  medium: "#FBBF24",
  low: "#38BDF8",
};

const rings = [
  { size: "w-16 h-16", border: "border-2 border-[#2C7BE5]", pulse: null },
  {
    size: "w-32 h-32",
    border: "border border-[#2C7BE5]/60",
    pulse: { scale: [1, 1.05, 1], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
  },
  {
    size: "w-52 h-52",
    border: "border border-[#2C7BE5]/30",
    pulse: { scale: [1, 1.08, 1], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  },
  {
    size: "w-72 h-72",
    border: "border border-[#2C7BE5]/15",
    pulse: { scale: [1, 1.1, 1], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  },
];

function AnimatedEllipsis() {
  return (
    <span className="inline-flex w-6 ml-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="text-white"
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}

export default function ProcessingPage() {
  const router = useRouter();
  const [frameCount, setFrameCount] = useState(1);
  const [progress, setProgress] = useState(0);
  const [visibleFindings, setVisibleFindings] = useState<typeof findings.findings>([]);
  const [complete, setComplete] = useState(false);
  const [flash, setFlash] = useState(false);

  // Frame counter
  useEffect(() => {
    if (complete) return;
    const iv = setInterval(() => {
      setFrameCount((prev) => (prev < TOTAL_FRAMES ? prev + 1 : prev));
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [complete]);

  // Progress tracker (synced to real elapsed time)
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const pct = Math.min((elapsed / DURATION_S) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Findings stream
  useEffect(() => {
    if (complete) return;
    let idx = 0;
    const iv = setInterval(() => {
      if (idx < findings.findings.length) {
        setVisibleFindings((prev) => [findings.findings[idx], ...prev]);
        idx++;
      } else {
        clearInterval(iv);
      }
    }, FINDING_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [complete]);

  // Completion handler
  const handleComplete = useCallback(() => {
    if (complete) return;
    setComplete(true);
    setFlash(true);
    setFrameCount(TOTAL_FRAMES);
    setTimeout(() => setFlash(false), 400);
    setTimeout(() => router.push("/results"), 800);
  }, [complete, router]);

  useEffect(() => {
    if (progress >= 100 && !complete) handleComplete();
  }, [progress, complete, handleComplete]);

  const pctDisplay = Math.round(progress);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "#080C14",
        backgroundImage:
          "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(44,123,229,0.08) 0%, transparent 70%)",
      }}
    >
      {/* ─── Scanner rings ─── */}
      <div className="relative flex items-center justify-center w-72 h-72">
        {rings.map((ring, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${ring.size} ${ring.border} ${
              flash ? "!border-white" : ""
            }`}
            animate={ring.pulse ?? undefined}
            style={flash ? { borderColor: "white", transition: "border-color 150ms" } : undefined}
          />
        ))}
        <Home size={24} color="#2C7BE5" strokeWidth={1.5} />
      </div>

      {/* ─── Status text ─── */}
      <div className="mt-16 text-center">
        <h2 className="text-white text-2xl font-semibold inline-flex items-center">
          {complete ? "Analysis complete" : (
            <>
              Analyzing your walkthrough
              <AnimatedEllipsis />
            </>
          )}
        </h2>
        {!complete && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[#94A3B8] text-sm mt-2"
          >
            Scanning frame {frameCount} of {TOTAL_FRAMES}
          </motion.p>
        )}
      </div>

      {/* ─── Progress bar ─── */}
      <div className="mt-8 w-full max-w-sm px-4">
        <div className="bg-[#141E2B] rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#2C7BE5] to-[#38BDF8]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[#475569] text-xs text-right mt-1.5">
          {pctDisplay}% complete
        </p>
      </div>

      {/* ─── Findings stream ─── */}
      <div className="mt-10 w-full max-w-md px-4">
        <p className="text-[#94A3B8] text-sm font-medium mb-3">
          Findings discovered
        </p>
        <div className="space-y-2 max-h-52 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {visibleFindings.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="flex items-center justify-between bg-[#0F1923] border border-[#1E2D3D] rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: SEVERITY_COLOR[f.severity] }}
                  />
                  <span className="text-white text-sm font-medium">
                    {f.label}
                  </span>
                </div>
                <span className="text-[#2C7BE5] text-sm font-bold tabular-nums whitespace-nowrap ml-4">
                  ${f.repair_cost_low.toLocaleString()}–$
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
