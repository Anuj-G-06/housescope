"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Negotiation Letter</h3>
      <Card className="p-4">
        <textarea
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          className="w-full min-h-[300px] bg-transparent resize-none text-sm leading-relaxed focus:outline-none"
        />
      </Card>
      <div className="flex gap-3">
        <Button onClick={handleCopy} variant="outline">
          Copy to Clipboard
        </Button>
      </div>
    </div>
  );
}
