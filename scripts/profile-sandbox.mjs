import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(process.env.RAPIDHELM_PROFILE_URL ?? 'http://127.0.0.1:5173');
  await page.getByRole('status').filter({ hasText: 'Simulation ready' }).waitFor();
  await page.getByLabel('Canoe simulation viewport').focus();
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD');
  const samples = await page.evaluate(() => new Promise((resolve) => {
    const frameMs = [], simulationMs = [], renderMs = [];
    let previous = 0, frames = 0;
    const frame = (time) => {
      if (previous && frames > 30) {
        frameMs.push(time - previous);
        const values = document.querySelectorAll('.performance dd');
        simulationMs.push(parseFloat(values[1].textContent)); renderMs.push(parseFloat(values[2].textContent));
      }
      previous = time; frames++;
      if (frameMs.length < 240) requestAnimationFrame(frame);
      else resolve({ frameMs, simulationMs, renderMs });
    };
    requestAnimationFrame(frame);
  }));
  await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD');
  const summarize = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return { mean: values.reduce((a, b) => a + b, 0) / values.length, p50: sorted[Math.floor(sorted.length * 0.5)], p95: sorted[Math.floor(sorted.length * 0.95)] };
  };
  const report = { browser: browser.version(), platform: process.platform, architecture: process.arch, viewport: '1920×1080', renderer: 'SwiftShader (software WebGL)', input: 'W+D, baseline config, debug enabled', samples: 240, frameIntervalMs: summarize(samples.frameMs), simulationAndWasmMs: summarize(samples.simulationMs), renderSubmissionMs: summarize(samples.renderMs) };
  mkdirSync('test-results', { recursive: true }); writeFileSync('test-results/sprint-1-performance.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
