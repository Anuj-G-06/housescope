import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, batchFindingsSchema } from "@/lib/prompts";
import { CONFIDENCE_THRESHOLD } from "@/lib/constants";
import type { BatchRequest, Finding } from "@/lib/types";
import mockData from "@/data/mock-findings.json";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { frames, address } = (await request.json()) as BatchRequest;

  // Demo mode: return mock findings when no API credentials are configured
  const isDemo = !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN;
  if (isDemo) {
    await new Promise((r) => setTimeout(r, 1500));
    const batchFindings = mockData.findings
      .filter((f) => {
        return frames.some((fr) => Math.abs(fr.timestamp - f.timestamp_start) < 4);
      })
      .map((f) => ({
        ...f,
        frame_index: frames[0].index,
        timestamp: f.timestamp_start,
        category: f.category as Finding["category"],
        severity: f.severity as Finding["severity"],
      }));
    return NextResponse.json({ findings: batchFindings });
  }

  const frameIndices = frames.map((f) => f.index);

  const result = await generateText({
    model: "google/gemini-2.5-flash",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...frames.map((f) => ({
            type: "image" as const,
            image: f.data, // base64
          })),
          {
            type: "text" as const,
            text: USER_PROMPT_TEMPLATE(frameIndices) +
              `\n\nProperty address: ${address}`,
          },
        ],
      },
    ],
    output: Output.object({ schema: batchFindingsSchema }),
  });

  const findings: Finding[] = [];
  if (result.output) {
    for (const frameFinding of result.output.frame_findings) {
      for (const f of frameFinding.findings) {
        if (f.confidence >= CONFIDENCE_THRESHOLD) {
          const sourceFrame = frames.find((fr) => fr.index === frameFinding.frame_index);
          findings.push({
            ...f,
            frame_index: frameFinding.frame_index,
            timestamp: sourceFrame?.timestamp ?? 0,
          });
        }
      }
    }
  }

  return NextResponse.json({ findings });
}
