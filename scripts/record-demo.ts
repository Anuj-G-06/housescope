import { chromium } from "playwright";
import path from "path";

async function recordDemo() {
  console.log("Starting demo recording (1:30, mock mode)...\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordVideo: {
      dir: path.resolve("demo-recordings"),
      size: { width: 390, height: 844 },
    },
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const wait = (ms: number) => page.waitForTimeout(ms);

  // ─── 0:00 Home screen (3s) ───
  console.log("0:00 — Home screen");
  await page.goto("http://localhost:3000");
  await wait(3000);

  // ─── 0:03 Upload video (3s) ───
  console.log("0:03 — Upload video");
  await page.locator("#video-input").setInputFiles(path.resolve("data/walkthrough-demo.mp4"));
  await wait(3000);

  // ─── 0:06 Enter address (3s) ───
  console.log("0:06 — Enter address");
  await page.locator("#address").fill("1847 Banksville Rd, Pittsburgh, PA");
  await wait(2000);

  // ─── 0:09 Tap Analyze (1s) ───
  console.log("0:09 — Tap Analyze");
  await page.locator("button", { hasText: "Analyze Property" }).click();
  await wait(1000);

  // ─── 0:10 Processing ───
  console.log("0:10 — Processing...");
  try {
    await page.locator("text=Inspection Results").waitFor({ timeout: 120000 });
  } catch {
    console.log("       Timed out, continuing...");
  }
  console.log("       Done!");
  await wait(2000);

  // ─── Video view (15s) ───
  console.log("0:30 — Video view");
  // Video tab should be active by default
  try {
    await page.locator("video").first().click();
  } catch { /* ignore */ }
  await wait(8000);
  // Try next finding button
  try {
    // Just wait and let captions show
  } catch { /* ignore */ }
  await wait(7000);

  // ─── Report tab (12s) ───
  console.log("0:45 — Report tab");
  await page.locator("[data-tab='report']").click();
  await wait(2000);
  // Scroll slowly
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 60);
    await wait(800);
  }
  await wait(2000);

  // ─── Costs tab (10s) ───
  console.log("0:57 — Costs tab");
  await page.locator("[data-tab='costs']").click();
  await wait(2000);
  // Scroll slowly
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 60);
    await wait(800);
  }
  await wait(1600);

  // ─── Download PDF (3s) ───
  console.log("1:07 — Download PDF");
  try {
    await page.locator("button[title='Export PDF']").click();
  } catch {
    console.log("       Could not find PDF button");
  }
  await wait(3000);

  // ─── Switch back to Video tab briefly (2s) ───
  console.log("1:10 — Back to Video");
  await page.locator("[data-tab='video']").click();
  await wait(2000);

  // ─── Back to home (5s) ───
  console.log("1:12 — Back to home");
  // The back arrow is inside the AppShell header
  await page.locator("button").first().click();
  await wait(5000);

  // ─── Properties tab (5s) ───
  console.log("1:17 — Properties tab");
  await page.locator("[data-tab='properties']").click();
  await wait(5000);

  // ─── Back to Home tab — closing shot (8s) ───
  console.log("1:22 — Closing shot on Home");
  await page.locator("[data-tab='home']").click();
  await wait(8000);

  // Done
  console.log("\nRecording complete!");
  const videoFile = page.video();
  await page.close();

  if (videoFile) {
    const savedPath = await videoFile.path();
    console.log(`Video saved to: ${savedPath}`);
  }

  await context.close();
  await browser.close();
  console.log("Check demo-recordings/ for the .webm file.");
}

recordDemo().catch(console.error);
