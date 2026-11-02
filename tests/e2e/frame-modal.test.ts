import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { chromium, type Browser, type Frame } from "playwright";
import { extractModalFromFrame } from "../../src/scanner/consent-modal.js";

// Sourcepoint renders its modal in a cross-origin iframe, so the scanner reads it through the
// Frame. These tests use srcdoc iframes, which exercise the same Frame API.

const IFRAME_BODY = `
  <button style="width:300px;font-size:20px;background:#0a7d2c;color:#fff">Accept all</button>
  <button style="width:80px;font-size:11px;background:#ddd;color:#555">Reject all</button>
  <label><input type="checkbox" id="m" checked> Marketing</label>
  <label><input type="checkbox" id="n" checked disabled> Strictly necessary</label>
  <div><div role="switch" aria-checked="true"></div> Analytics</div>
  <a href="https://example.com/p/42">Personuppgifts- och&nbsp;cookiepolicy</a>
`;

describe("extractModalFromFrame", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser?.close();
  });

  async function withFrame<T>(
    iframeBody: string,
    run: (frame: Frame) => Promise<T>,
    mainBody = "",
  ): Promise<T> {
    const page = await browser.newPage();
    try {
      const srcdoc = iframeBody.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      await page.setContent(
        `<html><body>${mainBody}<iframe srcdoc="${srcdoc}" width="600" height="400"></iframe></body></html>`,
      );
      const frame = await (await page.$("iframe"))!.contentFrame();
      return await run(frame!);
    } finally {
      await page.close();
    }
  }

  it("finds the policy link by its text when the href has no stem", async () => {
    const modal = await withFrame(IFRAME_BODY, (f) => extractModalFromFrame(f));
    expect(modal.privacyPolicyUrl).toBe("https://example.com/p/42");
  });

  it("reports a pre-ticked checkbox and a checked role=switch", async () => {
    const modal = await withFrame(IFRAME_BODY, (f) => extractModalFromFrame(f));
    expect(modal.checkboxes).toContainEqual(
      expect.objectContaining({ label: "Marketing", isCheckedByDefault: true }),
    );
    expect(modal.checkboxes).toContainEqual(
      expect.objectContaining({ label: "Analytics", isCheckedByDefault: true }),
    );
  });

  it("keeps a disabled checkbox by default and drops it with skipDisabledCheckboxes", async () => {
    const byDefault = await withFrame(IFRAME_BODY, (f) => extractModalFromFrame(f));
    expect(byDefault.checkboxes).toHaveLength(3);
    const skipped = await withFrame(IFRAME_BODY, (f) =>
      extractModalFromFrame(f, { skipDisabledCheckboxes: true }),
    );
    expect(skipped.checkboxes).toHaveLength(2);
    expect(skipped.checkboxes.some((c) => c.label.includes("Strictly necessary"))).toBe(false);
  });

  it("measures size, font size and contrast", async () => {
    const modal = await withFrame(IFRAME_BODY, (f) => extractModalFromFrame(f));
    const accept = modal.buttons.find((b) => b.type === "accept")!;
    const reject = modal.buttons.find((b) => b.type === "reject")!;
    expect(accept.boundingBox!.width).toBeGreaterThan(reject.boundingBox!.width);
    expect(accept.fontSize).toBe(20);
    expect(reject.fontSize).toBe(11);
    expect(typeof accept.contrastRatio).toBe("number");
    expect(typeof reject.contrastRatio).toBe("number");
    expect(accept.isVisible).toBe(true);
    expect(reject.isVisible).toBe(true);
  });

  it("returns empty data for a blank frame without throwing", async () => {
    const modal = await withFrame("", (f) => extractModalFromFrame(f));
    expect(modal.buttons).toEqual([]);
    expect(modal.checkboxes).toEqual([]);
    expect(modal.privacyPolicyUrl).toBeNull();
  });

  it("returns empty data when the frame is detached", async () => {
    const page = await browser.newPage();
    try {
      await page.setContent(`<iframe srcdoc="<button>Accept</button>"></iframe>`);
      const frame = (await (await page.$("iframe"))!.contentFrame())!;
      await page.evaluate(() => document.querySelector("iframe")!.remove());
      const modal = await extractModalFromFrame(frame);
      expect(modal.buttons).toEqual([]);
      expect(modal.checkboxes).toEqual([]);
      expect(modal.privacyPolicyUrl).toBeNull();
    } finally {
      await page.close();
    }
  });

  it("does not read the main page", async () => {
    const modal = await withFrame(
      "",
      (f) => extractModalFromFrame(f),
      `<footer><a href="https://example.com/privacy">Privacy policy</a></footer><button>Accept</button>`,
    );
    expect(modal.privacyPolicyUrl).toBeNull();
    expect(modal.buttons).toEqual([]);
  });
});
