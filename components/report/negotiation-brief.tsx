"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";

interface NegotiationBriefProps {
  result: AnalysisResult;
  address: string;
}

export function NegotiationBrief({ result, address }: NegotiationBriefProps) {
  const negotiationLow = Math.round(result.total_cost_low * 0.7);
  const negotiationHigh = Math.round(result.total_cost_high * 0.85);

  const defaultLetter = `Dear [Agent Name],

Following our review of the property at ${address}, an AI-assisted inspection analysis has identified ${result.manifest.length} issue(s) requiring attention, with estimated repair costs ranging from $${result.total_cost_low.toLocaleString()} to $${result.total_cost_high.toLocaleString()}.

Key findings include:
${result.manifest
  .slice(0, 5)
  .map((f) => `- ${f.label} (${f.severity}): $${f.repair_cost_low.toLocaleString()}–$${f.repair_cost_high.toLocaleString()}`)
  .join("\n")}

Based on standard negotiation practices and the scope of repairs needed, we are requesting a price reduction of $${negotiationLow.toLocaleString()} to $${negotiationHigh.toLocaleString()}, or equivalent credit at closing.

A detailed inspection report with annotated video documentation is available for review.

Best regards,
[Your Name]`;

  const [letter, setLetter] = useState(defaultLetter);
  const [showLetter, setShowLetter] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Negotiation Letter</h3>

      {!showLetter ? (
        <button
          onClick={() => setShowLetter(true)}
          className="bg-[var(--color-primary)] text-white rounded-xl px-5 py-2.5 hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
        >
          View Negotiation Letter
        </button>
      ) : (
        <>
          <div className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl p-6">
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              className="w-full min-h-[300px] bg-transparent text-[var(--color-text-secondary)] text-sm font-mono leading-relaxed resize-none focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="bg-[var(--color-primary)] text-white rounded-xl px-5 py-2.5 hover:bg-[var(--color-primary-dark)] transition-colors font-medium text-sm"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
