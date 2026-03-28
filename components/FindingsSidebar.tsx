"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { Finding } from "@/lib/types";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#F43F5E",
  high: "#FB923C",
  medium: "#FBBF24",
  low: "#38BDF8",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatCost(n: number): string {
  return n.toLocaleString("en-US");
}

interface Props {
  findings: Finding[];
  activeId: string | null;
  onSelect: (id: string, ts: number) => void;
}

export default function FindingsSidebar({ findings, activeId, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Count severities
  const counts: Record<string, number> = {};
  findings.forEach((f) => {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  });

  const breakdownParts = (["critical", "high", "medium", "low"] as const).filter(
    (s) => counts[s],
  );

  // Auto-scroll to active card
  useEffect(() => {
    if (!activeId) return;
    const el = cardRefs.current[activeId];
    if (!el || !listRef.current) return;
    const list = listRef.current;
    const top = el.offsetTop - list.offsetTop;
    const visible = top >= list.scrollTop && top + el.offsetHeight <= list.scrollTop + list.clientHeight;
    if (!visible) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeId]);

  return (
    <div className="bg-[#0F1923] border-l border-[#1E2D3D] h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#1E2D3D] flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white font-semibold text-sm">
            {findings.length} Finding{findings.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            {breakdownParts.map((sev, i) => (
              <span key={sev} className="flex items-center gap-1">
                {i > 0 && <span className="text-[#1E2D3D]">·</span>}
                <span style={{ color: SEVERITY_COLOR[sev] }}>
                  {counts[sev]} {SEVERITY_LABEL[sev].toLowerCase()}
                </span>
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* Findings list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#1E2D3D transparent",
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {findings.map((f) => {
            const isActive = f.id === activeId;
            const color = SEVERITY_COLOR[f.severity];

            return (
              <motion.div
                key={f.id}
                ref={(el) => { cardRefs.current[f.id] = el; }}
                variants={{
                  hidden: { opacity: 0, x: 16 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.4, 0.25, 1] } },
                }}
                onClick={() => onSelect(f.id, f.timestamp_start)}
                className={`
                  relative flex cursor-pointer border-b border-[#1E2D3D]
                  transition-colors duration-150
                  ${isActive ? "bg-[#141E2B]" : "bg-transparent hover:bg-white/[0.03]"}
                `}
              >
                {/* Left accent bar */}
                <div
                  className="w-[3px] flex-shrink-0 rounded-full my-3 ml-1"
                  style={{
                    backgroundColor: color,
                    opacity: isActive ? 1 : 0.4,
                    boxShadow: isActive ? `0 0 8px ${color}` : "none",
                    transition: "opacity 150ms, box-shadow 150ms",
                  }}
                />

                <div className="flex-1 px-4 py-4 min-w-0">
                  {/* Top row: severity + timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-medium rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                      }}
                    >
                      {SEVERITY_LABEL[f.severity]}
                    </span>
                    <span className="bg-white/5 text-[#94A3B8] text-xs rounded px-1.5 py-0.5 tabular-nums flex-shrink-0">
                      {formatTimestamp(f.timestamp_start)}
                    </span>
                  </div>

                  {/* Label */}
                  <p className="text-white font-medium text-sm mt-1.5 truncate">
                    {f.label}
                  </p>

                  {/* Description */}
                  <p className="text-[#475569] text-xs mt-0.5 line-clamp-2 leading-relaxed">
                    {f.description}
                  </p>

                  {/* Cost */}
                  <p className="text-[#2C7BE5] text-sm font-semibold mt-2">
                    ${formatCost(f.repair_cost_low)} – ${formatCost(f.repair_cost_high)}{" "}
                    <span className="text-[#475569] font-normal text-xs">estimated repair</span>
                  </p>

                  {/* Confidence bar */}
                  <div className="mt-2.5 h-0.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${f.confidence * 100}%`,
                        backgroundColor: `${color}66`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
