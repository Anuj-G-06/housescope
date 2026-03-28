"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SEVERITY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import type { Finding } from "@/lib/types";

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 flex items-start gap-3">
        <div
          className="mt-1 h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: SEVERITY_COLORS[finding.severity] }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{finding.label}</span>
            <Badge variant="secondary" className="text-xs">
              {CATEGORY_LABELS[finding.category]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ${finding.repair_cost_low.toLocaleString()} &ndash; $
            {finding.repair_cost_high.toLocaleString()}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
