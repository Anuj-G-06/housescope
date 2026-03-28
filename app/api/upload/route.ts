import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ url: null, skipped: true });
  }

  const formData = await request.formData();
  const file = formData.get("video") as File;

  if (!file) {
    return NextResponse.json({ error: "No video file" }, { status: 400 });
  }

  const blob = await put(`housescope/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
