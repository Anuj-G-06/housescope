import { describe, it, expect } from "vitest";
import { calculateIoU, deduplicateFindings } from "../deduplication";

describe("calculateIoU", () => {
  it("returns 1 for identical boxes", () => {
    const box = { x: 0.1, y: 0.1, w: 0.3, h: 0.3 };
    expect(calculateIoU(box, box)).toBeCloseTo(1.0);
  });

  it("returns 0 for non-overlapping boxes", () => {
    const a = { x: 0.0, y: 0.0, w: 0.1, h: 0.1 };
    const b = { x: 0.5, y: 0.5, w: 0.1, h: 0.1 };
    expect(calculateIoU(a, b)).toBe(0);
  });

  it("returns value between 0 and 1 for partial overlap", () => {
    const a = { x: 0.0, y: 0.0, w: 0.4, h: 0.4 };
    const b = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
    const iou = calculateIoU(a, b);
    expect(iou).toBeGreaterThan(0);
    expect(iou).toBeLessThan(1);
  });
});

describe("deduplicateFindings", () => {
  it("merges findings with same category and high IoU", () => {
    const findings = [
      {
        id: "f1", category: "water_damage" as const, severity: "critical" as const,
        label: "Water stain", description: "desc", confidence: 0.9,
        bbox: { x: 0.2, y: 0.1, w: 0.3, h: 0.3 },
        repair_cost_low: 4000, repair_cost_high: 9000,
        code_reference: null, frame_index: 0, timestamp: 0,
      },
      {
        id: "f2", category: "water_damage" as const, severity: "critical" as const,
        label: "Water stain", description: "desc", confidence: 0.85,
        bbox: { x: 0.21, y: 0.11, w: 0.3, h: 0.3 },
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
        bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
        repair_cost_low: 4000, repair_cost_high: 9000,
        code_reference: null, frame_index: 0, timestamp: 0,
      },
      {
        id: "f2", category: "electrical" as const, severity: "medium" as const,
        label: "GFCI violation", description: "desc", confidence: 0.8,
        bbox: { x: 0.7, y: 0.7, w: 0.2, h: 0.2 },
        repair_cost_low: 150, repair_cost_high: 300,
        code_reference: "NEC 210.8", frame_index: 0, timestamp: 0,
      },
    ];
    const result = deduplicateFindings(findings);
    expect(result).toHaveLength(2);
  });
});
