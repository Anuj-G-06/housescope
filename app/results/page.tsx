"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, Zap, FileText, Download } from "lucide-react";
import AnnotatedPlayer, { type AnnotatedPlayerHandle } from "@/components/AnnotatedPlayer";
import FindingsSidebar from "@/components/FindingsSidebar";
import NegotiationModal from "@/components/NegotiationModal";
import data from "@/data/mock-findings.json";
import type { Finding } from "@/lib/types";

const findings = data.findings as Finding[];
const summary = data.summary;
const property = data.property;

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

const CATEGORY_LABEL: Record<string, string> = {
  water_damage: "Water Damage",
  electrical: "Electrical",
  foundation: "Foundation",
  structural: "Structural",
  hvac: "HVAC",
  roof: "Roof / Ceiling",
  plumbing: "Plumbing",
  safety: "Safety",
};

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] },
});

function formatCost(n: number): string {
  return n.toLocaleString("en-US");
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─── Risk Score Arc (SVG) ─── */
function RiskArc({ score }: { score: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const pct = score / 100;

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#1E2D3D"
          strokeWidth="8"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#F43F5E"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white text-lg font-bold">{score}</span>
        <span className="text-[#94A3B8] text-[10px]">/ 100</span>
      </div>
    </div>
  );
}

/* ─── Cost Breakdown Bar ─── */
function CostBar({
  label,
  low,
  high,
  maxHigh,
  color,
  delay,
}: {
  label: string;
  low: number;
  high: number;
  maxHigh: number;
  color: string;
  delay: number;
}) {
  const pct = maxHigh > 0 ? (high / maxHigh) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#94A3B8] text-xs w-28 flex-shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
      <span className="text-white text-xs font-semibold w-32 flex-shrink-0 tabular-nums">
        ${formatCost(low)} – ${formatCost(high)}
      </span>
    </div>
  );
}

/* ─── Expandable Finding Card ─── */
function FindingDetailCard({
  finding,
  isActive,
  isExpanded,
  onToggle,
  onJump,
}: {
  finding: Finding;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onJump: () => void;
}) {
  const color = SEVERITY_COLOR[finding.severity];

  return (
    <div
      className={`
        relative border-l-[3px] rounded-xl overflow-hidden transition-all duration-200
        ${isActive ? "bg-[#141E2B]" : "bg-[#0F1923] hover:bg-white/[0.03]"}
      `}
      style={{
        borderLeftColor: color,
        boxShadow: isActive ? `inset 3px 0 12px -4px ${color}40` : "none",
      }}
    >
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span
          className="text-xs font-medium rounded-full px-2 py-0.5 flex-shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {SEVERITY_LABEL[finding.severity]}
        </span>
        <span className="text-white text-sm font-medium flex-1 truncate">
          {finding.label}
        </span>
        <span className="text-[#2C7BE5] text-sm font-bold tabular-nums flex-shrink-0">
          ${formatCost(finding.repair_cost_low)}–${formatCost(finding.repair_cost_high)}
        </span>
        <span className="text-[#475569] text-xs tabular-nums flex-shrink-0 ml-1">
          {formatTimestamp(finding.timestamp_start)}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={16} className="text-[#475569]" />
        </motion.div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3">
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                {finding.description}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {finding.code_reference && (
                  <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-[#94A3B8] text-xs rounded-md px-2 py-1">
                    <FileText size={11} />
                    {finding.code_reference}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-[#94A3B8] text-xs rounded-md px-2 py-1">
                  {Math.round(finding.confidence * 100)}% confidence
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onJump();
                }}
                className="inline-flex items-center gap-1.5 text-[#2C7BE5] text-xs font-medium hover:text-white transition-colors"
              >
                <Clock size={12} />
                Jump to {formatTimestamp(finding.timestamp_start)} in video
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Category cost aggregation ─── */
function getCategoryCosts(findingsList: Finding[]) {
  const cats: Record<string, { low: number; high: number; severity: string }> = {};
  findingsList.forEach((f) => {
    if (!cats[f.category]) {
      cats[f.category] = { low: 0, high: 0, severity: f.severity };
    }
    cats[f.category].low += f.repair_cost_low;
    cats[f.category].high += f.repair_cost_high;
    const order = ["critical", "high", "medium", "low"];
    if (order.indexOf(f.severity) < order.indexOf(cats[f.category].severity)) {
      cats[f.category].severity = f.severity;
    }
  });
  return Object.entries(cats).sort((a, b) => b[1].high - a[1].high);
}

/* ─── Main Results Page ─── */
export default function ResultsPage() {
  const playerRef = useRef<AnnotatedPlayerHandle>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showLetter, setShowLetter] = useState(false);

  const handleFindingActive = useCallback((id: string) => {
    setActiveId(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleSidebarSelect = useCallback(
    (id: string, ts: number) => {
      setActiveId(id);
      playerRef.current?.seekTo(ts);
    },
    [],
  );

  const handleJump = useCallback(
    (ts: number) => {
      playerRef.current?.seekTo(ts);
    },
    [],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const categoryCosts = getCategoryCosts(findings);
  const maxCatHigh = Math.max(...categoryCosts.map(([, v]) => v.high), 1);

  return (
    <div className="h-screen flex flex-col bg-base overflow-hidden">
      {/* ─── Navbar ─── */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 py-3 backdrop-blur-md bg-black/30 border-b border-white/5 z-50">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-sm bg-primary" />
          <span className="text-white font-bold tracking-tight text-lg">
            HomeScope
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="/"
            className="text-text-body text-sm hover:text-white transition-colors"
          >
            New analysis
          </a>
          <button className="bg-primary text-white text-sm rounded-full px-4 py-1.5 font-medium hover:bg-primary-hover transition-colors">
            Share report
          </button>
        </div>
      </nav>

      {/* ─── Two-column layout ─── */}
      <div className="flex flex-1 min-h-0">
        {/* Left column */}
        <div className="flex-1 overflow-y-auto">
          {/* Address bar */}
          <div className="px-6 pt-4 pb-2">
            <motion.div {...fade(0)} className="inline-flex items-center gap-2 bg-[#0F1923] border border-[#1E2D3D] rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white text-sm">{property.address}</span>
              <span className="text-[#475569] text-xs">· Analysis complete</span>
            </motion.div>
          </div>

          {/* Video player */}
          <motion.div {...fade(0.05)} className="px-6 pt-2">
            <AnnotatedPlayer
              ref={playerRef}
              videoUrl="/demo.mp4"
              findings={findings}
              onFindingActive={handleFindingActive}
            />
          </motion.div>

          {/* ─── Report sections ─── */}
          <div className="px-6 pb-12">
            {/* 1. Risk Score */}
            <motion.div
              {...fade(0.1)}
              className="mt-6 bg-[#0F1923] border border-[#1E2D3D] rounded-2xl p-6 flex items-center justify-between gap-6"
            >
              <div>
                <p className="text-[#94A3B8] text-sm">Risk Score</p>
                <p className="text-7xl font-bold mt-1" style={{ color: "#F43F5E" }}>
                  {summary.overall_risk_score}
                </p>
                <span className="inline-block mt-2 bg-[#F43F5E]/15 text-[#F43F5E] text-xs font-semibold rounded-full px-3 py-1 uppercase tracking-wide">
                  High Risk
                </span>
              </div>
              <RiskArc score={summary.overall_risk_score} />
            </motion.div>

            {/* 2. Cost Estimate */}
            <motion.div
              {...fade(0.2)}
              className="mt-4 bg-gradient-to-br from-[#0F1923] to-[#141E2B] border border-[#1E2D3D] rounded-2xl p-6"
            >
              <p className="text-[#94A3B8] text-sm">Estimated Repair Costs</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${formatCost(summary.total_cost_low)} – ${formatCost(summary.total_cost_high)}
              </p>

              <div className="mt-5 space-y-3">
                {categoryCosts.map(([cat, vals], i) => (
                  <CostBar
                    key={cat}
                    label={CATEGORY_LABEL[cat] ?? cat}
                    low={vals.low}
                    high={vals.high}
                    maxHigh={maxCatHigh}
                    color={SEVERITY_COLOR[vals.severity]}
                    delay={0.3 + i * 0.1}
                  />
                ))}
              </div>
            </motion.div>

            {/* 3. Negotiation Callout */}
            <motion.div
              {...fade(0.3)}
              className="mt-4 bg-[#0A1628] border border-[#2C7BE5]/40 rounded-2xl p-6"
              style={{ boxShadow: "inset 0 0 30px rgba(44,123,229,0.1)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} className="text-[#2C7BE5]" />
                <span className="text-[#2C7BE5] text-sm font-semibold">
                  Negotiation Recommendation
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                Request ${formatCost(summary.negotiation_ask_low)} – $
                {formatCost(summary.negotiation_ask_high)}
              </p>
              <p className="text-[#94A3B8] text-sm mt-1">
                in price reduction or repair credits before signing
              </p>
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={() => setShowLetter(true)}
                  className="bg-[#2C7BE5] text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:bg-[#1E6DD4] transition-all hover:shadow-[0_0_20px_rgba(44,123,229,0.4)]"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={15} />
                    Get Negotiation Letter
                  </span>
                </button>
                <button className="bg-white/5 border border-white/10 text-white text-sm font-medium rounded-xl px-5 py-2.5 hover:bg-white/10 transition-all hover:shadow-[0_0_16px_rgba(255,255,255,0.05)]">
                  <span className="flex items-center gap-2">
                    <Download size={15} />
                    Export PDF
                  </span>
                </button>
              </div>
            </motion.div>

            {/* 4. Findings Detail List */}
            <motion.div {...fade(0.4)} className="mt-6">
              <h2 className="text-white font-semibold text-lg mb-4">
                All Findings
              </h2>
              <div className="space-y-2">
                {findings.map((f) => (
                  <FindingDetailCard
                    key={f.id}
                    finding={f}
                    isActive={f.id === activeId}
                    isExpanded={expandedIds.has(f.id)}
                    onToggle={() => toggleExpanded(f.id)}
                    onJump={() => handleJump(f.timestamp_start)}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-[#1E2D3D] flex-shrink-0" />

        {/* Right column — Sidebar */}
        <div className="w-96 flex-shrink-0 hidden lg:block">
          <FindingsSidebar
            findings={findings}
            activeId={activeId}
            onSelect={handleSidebarSelect}
          />
        </div>
      </div>

      {/* Negotiation letter modal */}
      {showLetter && (
        <NegotiationModal
          findings={findings}
          address={property.address}
          totalLow={summary.total_cost_low}
          totalHigh={summary.total_cost_high}
          askLow={summary.negotiation_ask_low}
          askHigh={summary.negotiation_ask_high}
          onClose={() => setShowLetter(false)}
        />
      )}
    </div>
  );
}
