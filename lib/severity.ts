export const SEVERITY_CONFIG = {
  critical: {
    color: "#E05252",
    bg: "bg-[#E05252]/10",
    border: "border-[#E05252]/25",
    text: "text-[#E05252]",
    dot: "bg-[#E05252]",
    label: "Critical",
    shadow: "rgba(224,82,82,0.2)",
  },
  high: {
    color: "#D97B3A",
    bg: "bg-[#D97B3A]/10",
    border: "border-[#D97B3A]/25",
    text: "text-[#D97B3A]",
    dot: "bg-[#D97B3A]",
    label: "High",
    shadow: "rgba(217,123,58,0.2)",
  },
  medium: {
    color: "#C4A020",
    bg: "bg-[#C4A020]/10",
    border: "border-[#C4A020]/25",
    text: "text-[#C4A020]",
    dot: "bg-[#C4A020]",
    label: "Medium",
    shadow: "rgba(196,160,32,0.2)",
  },
  low: {
    color: "#5A9BB8",
    bg: "bg-[#5A9BB8]/10",
    border: "border-[#5A9BB8]/25",
    text: "text-[#5A9BB8]",
    dot: "bg-[#5A9BB8]",
    label: "Low",
    shadow: "rgba(90,155,184,0.2)",
  },
} as const;

export type Severity = keyof typeof SEVERITY_CONFIG;

export function getSeverity(s: Severity) {
  return SEVERITY_CONFIG[s];
}
