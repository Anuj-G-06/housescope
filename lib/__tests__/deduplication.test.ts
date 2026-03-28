import { describe, it, expect } from "vitest";
import { deduplicateFindings } from "../deduplication";

describe("deduplicateFindings", () => {
  it("merges findings with same category and label", () => {
    const findings = [
      {
        id: "f1", category: "water_damage" as const, severity: "critical" as const,
        label: "Water stain", description: "desc", confidence: 0.9,
        repair_cost_low: 4000, repair_cost_high: 9000,
        code_reference: null, frame_index: 0, timestamp: 0,
      },
      {
        id: "f2", category: "water_damage" as const, severity: "critical" as const,
        label: "Water stain", description: "desc", confidence: 0.85,
        repair_cost_low: 4000, repair_cost_high: 9000,
        code_reference: null, frame_index: 1, timestamp: 2,
      },
    ];
    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp_start).toBe(0);
    expect(result[0].timestamp_end).toBeGreaterThan(0);
  });

  it("keeps distinct findings separate", () => {
    const findings = [
      {
        id: "f1", category: "water_damage" as const, severity: "critical" as const,
        label: "Water stain", description: "desc", confidence: 0.9,
        repair_cost_low: 4000, repair_cost_high: 9000,
        code_reference: null, frame_index: 0, timestamp: 0,
      },
      {
        id: "f2", category: "electrical" as const, severity: "medium" as const,
        label: "GFCI violation", description: "desc", confidence: 0.8,
        repair_cost_low: 150, repair_cost_high: 300,
        code_reference: "NEC 210.8", frame_index: 0, timestamp: 0,
      },
    ];
    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(2);
  });

  it("does not merge same category with different labels", () => {
    const findings = [
      {
        id: "f1", category: "electrical" as const, severity: "high" as const,
        label: "Double-tapped breaker", description: "desc", confidence: 0.9,
        repair_cost_low: 800, repair_cost_high: 2500,
        code_reference: null, frame_index: 0, timestamp: 0,
      },
      {
        id: "f2", category: "electrical" as const, severity: "medium" as const,
        label: "Missing GFCI", description: "desc", confidence: 0.85,
        repair_cost_low: 150, repair_cost_high: 300,
        code_reference: null, frame_index: 1, timestamp: 2,
      },
    ];
    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(2);
  });
});
