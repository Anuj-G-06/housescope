"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { Finding } from "@/lib/types";
import { SEVERITY_CONFIG, type Severity } from "@/lib/severity";

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

  const counts: Record<string, number> = {};
  findings.forEach((f) => { counts[f.severity] = (counts[f.severity] || 0) + 1; });
  const breakdownParts = (["critical", "high", "medium", "low"] as const).filter((s) => counts[s]);

  useEffect(() => {
    if (!activeId) return;
    const el = cardRefs.current[activeId];
    if (!el || !listRef.current) return;
    const list = listRef.current;
    const top = el.offsetTop - list.offsetTop;
    const visible = top >= list.scrollTop && top + el.offsetHeight <= list.scrollTop + list.clientHeight;
    if (!visible) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  return (
    <div className="bg-surface border-l border-border h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-text-primary font-semibold text-sm">
            {findings.length} Finding{findings.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            {breakdownParts.map((sev, i) => {
              const cfg = SEVERITY_CONFIG[sev];
              return (
                <span key={sev} className="flex items-center gap-1">
                  {i > 0 && <span className="text-border">·</span>}
                  <span style={{ color: cfg.color }}>{counts[sev]} {cfg.label.toLowerCase()}</span>
                </span>
              );
            })}
          </span>
        </div>
      </div>

      {/* Findings list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {findings.map((f) => {
            const isActive = f.id === activeId;
            const sev = SEVERITY_CONFIG[f.severity as Severity];

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
                  relative flex cursor-pointer border-b border-border
                  transition-all duration-150
                  ${isActive ? "bg-white" : "bg-transparent hover:bg-white/60"}
                `}
              >
                {/* Left accent bar */}
                <div
                  className="w-[3px] flex-shrink-0 rounded-full my-3 ml-1 transition-all duration-150"
                  style={{
                    backgroundColor: sev.color,
                    opacity: isActive ? 1 : 0.3,
                    boxShadow: isActive ? `0 0 8px ${sev.shadow}` : "none",
                  }}
                />

                <div className="flex-1 px-4 py-4 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-0.5 border"
                      style={{
                        backgroundColor: `${sev.color}10`,
                        borderColor: `${sev.color}40`,
                        color: sev.color,
                      }}
                    >
                      {sev.label}
                    </span>
                    <span className="bg-base text-text-secondary text-xs rounded px-1.5 py-0.5 tabular flex-shrink-0">
                      {formatTimestamp(f.timestamp_start)}
                    </span>
                  </div>

                  <p className="text-text-primary font-medium text-sm mt-1.5 truncate">
                    {f.label}
                  </p>

                  <p className="text-text-muted text-xs mt-0.5 line-clamp-2 leading-relaxed">
                    {f.description}
                  </p>

                  <p className="text-primary-dark text-sm font-semibold mt-2 tabular">
                    ${formatCost(f.repair_cost_low)} – ${formatCost(f.repair_cost_high)}{" "}
                    <span className="text-text-muted font-normal text-xs">estimated repair</span>
                  </p>

                  <div className="mt-2.5 h-0.5 rounded-full bg-[#EDE8E1] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${f.confidence * 100}%`,
                        backgroundColor: `${sev.color}40`,
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

/* ─── Mobile Findings Pill Strip ─── */
export function FindingsPillStrip({
  findings,
  activeId,
  onSelect,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-id="${activeId}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-border sticky top-[57px] z-10 md:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {findings.map((f) => {
        const isActive = f.id === activeId;
        const sev = SEVERITY_CONFIG[f.severity as Severity];
        const truncated = f.label.length > 20 ? f.label.slice(0, 20) + "…" : f.label;

        return (
          <button
            key={f.id}
            data-id={f.id}
            onClick={() => onSelect(f.id, f.timestamp_start)}
            className={`
              flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
              whitespace-nowrap flex-shrink-0 transition-all duration-150 border
              ${
                isActive
                  ? "bg-primary text-white border-primary shadow-[0_2px_8px_rgba(123,184,212,0.3)]"
                  : "bg-white text-text-primary border-border hover:border-primary"
              }
            `}
          >
            <span
              className="block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isActive ? "white" : sev.color }}
            />
            {truncated}
          </button>
        );
      })}
    </div>
  );
}
