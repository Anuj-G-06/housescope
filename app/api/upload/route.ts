import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("video") as File;

  if (!file) {
    return NextResponse.json({ error: "No video file" }, { status: 400 });
  }

  const blob = await put(`homescope/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
