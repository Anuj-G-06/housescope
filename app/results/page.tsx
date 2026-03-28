"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, Zap, FileText, Download } from "lucide-react";
import AnnotatedPlayer, { type AnnotatedPlayerHandle } from "@/components/AnnotatedPlayer";
import FindingsSidebar, { FindingsPillStrip } from "@/components/FindingsSidebar";
import NegotiationModal from "@/components/NegotiationModal";
import Button from "@/components/ui/Button";
import data from "@/data/mock-findings.json";
import type { Finding } from "@/lib/types";
import { SEVERITY_CONFIG, type Severity } from "@/lib/severity";

const findings = data.findings as Finding[];
const summary = data.summary;
const property = data.property;

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

/* ─── Risk Score Arc ─── */
function RiskArc({ score }: { score: number }) {
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 70 ? "#E05252" : score >= 40 ? "#D97B3A" : "#5A9BB8";

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#EDE8E1" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-text-primary text-lg font-bold">{score}</span>
        <span className="text-text-muted text-[10px]">/ 100</span>
      </div>
    </div>
  );
}

/* ─── Cost Breakdown Bar ─── */
function CostBar({
  label, low, high, maxHigh, color, delay,
}: {
  label: string; low: number; high: number; maxHigh: number; color: string; delay: number;
}) {
  const pct = maxHigh > 0 ? (high / maxHigh) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-secondary text-xs w-28 flex-shrink-0 text-right">{label}</span>
      <div className="flex-1 h-2 bg-[#EDE8E1] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
      <span className="text-text-primary text-xs font-semibold w-32 flex-shrink-0 tabular">
        ${formatCost(low)} – ${formatCost(high)}
      </span>
    </div>
  );
}

/* ─── Expandable Finding Card ─── */
function FindingDetailCard({
  finding, isActive, isExpanded, onToggle, onJump,
}: {
  finding: Finding; isActive: boolean; isExpanded: boolean; onToggle: () => void; onJump: () => void;
}) {
  const sev = SEVERITY_CONFIG[finding.severity as Severity];

  return (
    <div
      className={`
        relative border-l-[3px] rounded-2xl overflow-hidden transition-all duration-200
        bg-white border border-border
        ${isActive ? "shadow-warm-lg" : "shadow-warm hover:shadow-warm-lg"}
      `}
      style={{
        borderLeftColor: sev.color,
        boxShadow: isActive ? `inset 3px 0 12px -4px ${sev.shadow}, 0 2px 8px rgba(120,100,80,0.08), 0 8px 32px rgba(120,100,80,0.06)` : undefined,
      }}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span
          className="text-xs font-medium rounded-full px-2.5 py-0.5 flex-shrink-0 border"
          style={{ backgroundColor: `${sev.color}10`, borderColor: `${sev.color}40`, color: sev.color }}
        >
          {sev.label}
        </span>
        <span className="text-text-primary text-sm font-medium flex-1 truncate">{finding.label}</span>
        <span className="text-primary-dark text-sm font-bold tabular flex-shrink-0">
          ${formatCost(finding.repair_cost_low)}–${formatCost(finding.repair_cost_high)}
        </span>
        <span className="text-text-muted text-xs tabular flex-shrink-0 ml-1">
          {formatTimestamp(finding.timestamp_start)}
        </span>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
          <ChevronDown size={16} className="text-text-muted" />
        </motion.div>
      </button>

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
              <p className="text-text-secondary text-sm leading-relaxed">{finding.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {finding.code_reference && (
                  <span className="inline-flex items-center gap-1 bg-base border border-border text-text-secondary text-xs rounded-md px-2 py-1">
                    <FileText size={11} />
                    {finding.code_reference}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 bg-base border border-border text-text-secondary text-xs rounded-md px-2 py-1">
                  {Math.round(finding.confidence * 100)}% confidence
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onJump(); }}
                className="inline-flex items-center gap-1.5 text-primary-dark text-xs font-medium hover:text-text-primary transition-colors duration-150"
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
function getCategoryCosts(list: Finding[]) {
  const cats: Record<string, { low: number; high: number; severity: string }> = {};
  list.forEach((f) => {
    if (!cats[f.category]) cats[f.category] = { low: 0, high: 0, severity: f.severity };
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
  const findingRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleFindingActive = useCallback((id: string) => {
    setActiveId(id);
    setExpandedIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);

  const handleSidebarSelect = useCallback((id: string, ts: number) => {
    setActiveId(id);
    playerRef.current?.seekTo(ts);
  }, []);

  const handleMobilePillSelect = useCallback((id: string, ts: number) => {
    setActiveId(id);
    playerRef.current?.seekTo(ts);
    const el = findingRefs.current[id];
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }, []);

  const handleJump = useCallback((ts: number) => { playerRef.current?.seekTo(ts); }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const categoryCosts = getCategoryCosts(findings);
  const maxCatHigh = Math.max(...categoryCosts.map(([, v]) => v.high), 1);
  const riskColor = summary.overall_risk_score >= 70 ? "#E05252" : summary.overall_risk_score >= 40 ? "#D97B3A" : "#5A9BB8";

  return (
    <div className="h-screen flex flex-col bg-base overflow-hidden">
      {/* ─── Navbar ─── */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-surface/80 backdrop-blur-md border-b border-border z-50">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-sm bg-primary" />
          <span className="text-text-primary font-bold tracking-tight text-lg">HomeScope</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-text-secondary text-sm hover:text-text-primary transition-colors duration-150">
            New analysis
          </a>
          <Button variant="primary" className="!py-1.5 !px-4 !text-sm !rounded-full">
            Share report
          </Button>
        </div>
      </nav>

      {/* ─── Mobile pill strip ─── */}
      <FindingsPillStrip findings={findings} activeId={activeId} onSelect={handleMobilePillSelect} />

      {/* ─── Two-column layout ─── */}
      <div className="flex flex-1 min-h-0">
        {/* Left column */}
        <div className="flex-1 overflow-y-auto">
          {/* Address bar */}
          <div className="px-4 md:px-6 pt-4 pb-2">
            <motion.div {...fade(0)} className="inline-flex items-center gap-2 bg-white border border-border rounded-full px-4 py-2 shadow-warm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-text-primary text-sm">{property.address}</span>
              <span className="text-text-muted text-xs">· Analysis complete</span>
            </motion.div>
          </div>

          {/* Video player */}
          <motion.div {...fade(0.05)} className="px-4 md:px-6 pt-2">
            <AnnotatedPlayer
              ref={playerRef}
              videoUrl="/demo.mp4"
              findings={findings}
              onFindingActive={handleFindingActive}
            />
          </motion.div>

          {/* ─── Report sections ─── */}
          <div className="px-4 md:px-6 pb-12">
            {/* 1. Risk Score */}
            <motion.div
              {...fade(0.1)}
              className="mt-6 bg-white border border-border rounded-2xl p-6 shadow-warm-lg flex items-center justify-between gap-6"
            >
              <div>
                <p className="text-text-secondary text-sm">Risk Score</p>
                <p className="text-7xl font-bold mt-1" style={{ color: riskColor }}>{summary.overall_risk_score}</p>
                <span
                  className="inline-block mt-2 text-xs font-semibold rounded-full px-3 py-1 uppercase tracking-wide border"
                  style={{ backgroundColor: `${riskColor}10`, borderColor: `${riskColor}40`, color: riskColor }}
                >
                  High Risk
                </span>
              </div>
              <RiskArc score={summary.overall_risk_score} />
            </motion.div>

            {/* 2. Cost Estimate */}
            <motion.div
              {...fade(0.2)}
              className="mt-4 bg-white border border-border rounded-2xl p-6 shadow-warm"
            >
              <p className="text-text-secondary text-sm">Estimated Repair Costs</p>
              <p className="text-3xl font-bold text-text-primary mt-1 tabular">
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
                    color={SEVERITY_CONFIG[vals.severity as Severity]?.color ?? "#5A9BB8"}
                    delay={0.3 + i * 0.1}
                  />
                ))}
              </div>
            </motion.div>

            {/* 3. Negotiation Callout */}
            <motion.div
              {...fade(0.3)}
              className="mt-4 bg-[#F0F8FC] border border-[#7BB8D4]/40 rounded-2xl p-6 shadow-blue-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} className="text-primary-dark" />
                <span className="text-primary-dark text-sm font-semibold">Negotiation Recommendation</span>
              </div>
              <p className="text-2xl font-bold text-text-primary tabular">
                Request ${formatCost(summary.negotiation_ask_low)} – ${formatCost(summary.negotiation_ask_high)}
              </p>
              <p className="text-text-secondary text-sm mt-1">in price reduction or repair credits before signing</p>
              <div className="flex items-center gap-3 mt-5 flex-wrap">
                <Button variant="primary" onClick={() => setShowLetter(true)}>
                  <FileText size={15} />
                  Get Negotiation Letter
                </Button>
                <Button variant="secondary">
                  <Download size={15} />
                  Export PDF
                </Button>
              </div>
            </motion.div>

            {/* 4. Findings Detail List */}
            <motion.div {...fade(0.4)} className="mt-6">
              <h2 className="text-text-primary font-semibold text-lg mb-4">All Findings</h2>
              <div className="space-y-2">
                {findings.map((f) => (
                  <div key={f.id} ref={(el) => { findingRefs.current[f.id] = el; }}>
                    <FindingDetailCard
                      finding={f}
                      isActive={f.id === activeId}
                      isExpanded={expandedIds.has(f.id)}
                      onToggle={() => toggleExpanded(f.id)}
                      onJump={() => handleJump(f.timestamp_start)}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-border flex-shrink-0 hidden lg:block" />

        {/* Right column — Sidebar (desktop only) */}
        <div className="w-96 flex-shrink-0 hidden lg:block">
          <FindingsSidebar findings={findings} activeId={activeId} onSelect={handleSidebarSelect} />
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
