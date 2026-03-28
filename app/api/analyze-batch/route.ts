import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, batchFindingsSchema } from "@/lib/prompts";
import { CONFIDENCE_THRESHOLD } from "@/lib/constants";
import type { BatchRequest, Finding } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { frames, address } = (await request.json()) as BatchRequest;

  const frameIndices = frames.map((f) => f.index);

  const result = await generateText({
    model: "anthropic/claude-sonnet-4.5",
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
