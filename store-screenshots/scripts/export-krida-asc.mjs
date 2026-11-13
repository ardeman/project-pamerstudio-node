#!/usr/bin/env node
/**
 * Export Krida iPhone / iPad / Duo / creatives for App Store Connect upload.
 * Requires the editor on :3456 (`npm run dev -- -p 3456`).
 *
 *   node scripts/export-krida-asc.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "../../project-krida-kmp/.tmp/pamer-exports");
const BASE = process.env.EDITOR_URL || "http://localhost:3456";
const DEVICES = [
  "iphone",
  "ipad",
  "duo-outer-landscape",
  "duo-inner-landscape",
  "creative-header",
  "creative-search",
];

async function loadState(page) {
  const res = await page.request.get(`${BASE}/api/project`);
  if (!res.ok()) throw new Error(`GET /api/project ${res.status()}`);
  const json = await res.json();
  return json.state ?? json;
}

async function saveState(page, state) {
  const res = await page.request.post(`${BASE}/api/project`, {
    data: state,
    headers: { "content-type": "application/json" },
  });
  if (!res.ok()) throw new Error(`POST /api/project ${res.status()} ${await res.text()}`);
}

async function exportDevice(page, device) {
  const state = await loadState(page);
  state.device = device;
  state.orientation = "landscape";
  await saveState(page, state);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  const exportBtn = page.getByRole("button", { name: "Export bundle", exact: true });
  await exportBtn.waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(2000);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 600_000 }),
    exportBtn.click(),
  ]);
  const dest = join(OUT, `${device}.zip`);
  await download.saveAs(dest);
  console.log("wrote", dest);
  return dest;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
  const original = await loadState(page);
  try {
    for (const device of DEVICES) {
      console.log("exporting", device);
      await exportDevice(page, device);
    }
  } finally {
    try {
      await saveState(page, original);
    } catch (e) {
      console.warn("restore failed", e.message);
    }
    await browser.close();
  }
  console.log("DONE →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
