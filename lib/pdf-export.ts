import jsPDF from "jspdf";
import { CATEGORY_LABELS } from "./constants";
import type { AnalysisResult } from "./types";

export function exportReportPDF(result: AnalysisResult, address: string) {
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.text("HomeScope Inspection Report", 20, y);
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(address, 20, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
  y += 12;

  // Risk score
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text(`Risk Score: ${result.risk_score} / 100`, 20, y);
  y += 8;

  // Cost summary
  doc.setFontSize(11);
  doc.text(
    `Total Estimated Repairs: $${result.total_cost_low.toLocaleString()} – $${result.total_cost_high.toLocaleString()}`,
    20, y
  );
  y += 6;
  const negLow = Math.round(result.total_cost_low * 0.7);
  const negHigh = Math.round(result.total_cost_high * 0.85);
  doc.text(
    `Negotiation Range: $${negLow.toLocaleString()} – $${negHigh.toLocaleString()}`,
    20, y
  );
  y += 12;

  // Findings
  doc.setFontSize(14);
  doc.text("Findings", 20, y);
  y += 8;

  doc.setFontSize(10);
  for (const entry of result.manifest) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`[${entry.severity.toUpperCase()}] ${entry.label}`, 20, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`${CATEGORY_LABELS[entry.category]} | $${entry.repair_cost_low.toLocaleString()}–$${entry.repair_cost_high.toLocaleString()}`, 24, y);
    y += 5;

    const descLines = doc.splitTextToSize(entry.description, 160);
    doc.text(descLines, 24, y);
    y += descLines.length * 4.5 + 4;

    if (entry.code_reference) {
      doc.text(`Code: ${entry.code_reference}`, 24, y);
      y += 6;
    }
  }

  // Disclaimer
  y += 10;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "DISCLAIMER: This is an AI-assisted triage report, not a licensed home inspection. " +
    "Consult a licensed home inspector for a definitive assessment.",
    20, y,
    { maxWidth: 170 }
  );

  doc.save(`HomeScope-Report-${Date.now()}.pdf`);
}
