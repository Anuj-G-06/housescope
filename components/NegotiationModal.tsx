"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X } from "lucide-react";
import type { Finding } from "@/lib/types";
import Button from "@/components/ui/Button";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function buildLetter(
  address: string,
  findings: Finding[],
  totalLow: number,
  totalHigh: number,
  askLow: number,
  askHigh: number,
): string {
  const bullets = findings
    .map((f) => {
      const cost = `$${fmt(f.repair_cost_low)}–$${fmt(f.repair_cost_high)}`;
      const code = f.code_reference ? ` (${f.code_reference})` : "";
      return `  • ${f.label} — ${cost}${code}`;
    })
    .join("\n");

  return `Re: ${address}

Dear Agent/Seller,

I recently toured the property at ${address} and conducted a preliminary visual assessment using AI-assisted inspection analysis.

The assessment identified ${findings.length} items of concern with estimated repair costs totaling $${fmt(totalLow)}–$${fmt(totalHigh)}:

${bullets}

Based on these findings, I am requesting a price adjustment or repair credit of $${fmt(askLow)}–$${fmt(askHigh)} prior to closing.

I am happy to discuss these items further at your convenience.

Sincerely,
[Buyer]`;
}

interface Props {
  findings: Finding[];
  address: string;
  totalLow: number;
  totalHigh: number;
  askLow: number;
  askHigh: number;
  onClose: () => void;
}

export default function NegotiationModal({
  findings,
  address,
  totalLow,
  totalHigh,
  askLow,
  askHigh,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const letterText = buildLetter(address, findings, totalLow, totalHigh, askLow, askHigh);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, [letterText]);

  const askLine = `$${fmt(askLow)}–$${fmt(askHigh)}`;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Modal — desktop: centered card, mobile: slide up from bottom */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="
            relative w-full bg-white flex flex-col
            md:max-w-2xl md:mx-4 md:rounded-2xl md:shadow-warm-lg md:max-h-[85vh]
            max-md:h-full max-md:rounded-none
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary-dark" />
                <span className="text-text-primary font-semibold">Negotiation Letter</span>
              </div>
              <p className="text-text-muted text-sm mt-1">Ready to send to your agent or seller</p>
            </div>
            <button
              onClick={onClose}
              className="bg-base rounded-full p-1.5 hover:bg-[#EDE8E1] transition-colors duration-150"
            >
              <X size={16} className="text-text-secondary" />
            </button>
          </div>

          {/* Letter body */}
          <div className="px-6 py-5 overflow-y-auto flex-1">
            <div className="bg-base border border-border rounded-xl p-6 shadow-inset-warm">
              <pre className="font-mono text-sm leading-relaxed text-text-secondary whitespace-pre-wrap break-words">
                {letterText.split("\n").map((line, i) => {
                  const isAskLine = line.includes(askLine) && line.includes("requesting");
                  return (
                    <span key={i}>
                      {isAskLine ? (
                        <span className="bg-primary/10 text-text-primary rounded px-1 -mx-1 font-semibold">
                          {line}
                        </span>
                      ) : (
                        line
                      )}
                      {"\n"}
                    </span>
                  );
                })}
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <button
              onClick={handleCopy}
              className={`
                relative text-sm font-medium rounded-xl px-5 py-2.5 min-w-[130px]
                transition-all duration-200 inline-flex items-center justify-center
                ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-white hover:bg-primary-dark hover:shadow-primary-btn"
                }
              `}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Copied!
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    Copy Letter
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
