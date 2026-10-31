import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { chromium, type Browser } from "playwright";
import { findPrivacyPolicyUrl } from "../../src/scanner/consent-modal.js";

// Shadow-DOM cases. Every negative page holds a valid light-DOM policy link AFTER the bad
// one and asserts that href, so a crash inside evaluate cannot pass as "no match".
// The baseline pins (scope, /account/settings/privacy-policy, ...) live in
// privacy-link-baseline.test.ts and are unchanged.

const VALID = "https://example.com/valid-privacy-policy";
const LIGHT = `<a href="${VALID}">Privacy Policy</a>`;

describe("findPrivacyPolicyUrl shadow DOM", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser?.close();
  });

  async function find(body: string, scope?: string): Promise<string | null> {
    const page = await browser.newPage();
    try {
      await page.setContent(`<html><body>${body}</body></html>`);
      return await findPrivacyPolicyUrl(page, scope);
    } finally {
      await page.close();
    }
  }

  const shadowHost = (id: string, inner: string, mode: "open" | "closed" = "open") =>
    `<div id="${id}"></div><script>
      document.getElementById(${JSON.stringify(id)}).attachShadow({ mode: ${JSON.stringify(mode)} }).innerHTML = ${JSON.stringify(inner)};
    </script>`;

  it("finds a policy link in an open shadow root", async () => {
    const href = "https://example.com/shadow-policy";
    expect(await find(shadowHost("h", `<a href="${href}">Privacy Policy</a>`))).toBe(href);
  });

  it("finds a policy link in nested open shadow roots", async () => {
    const href = "https://example.com/nested-policy";
    const body = `<div id="outer"></div><script>
      const outer = document.getElementById("outer").attachShadow({ mode: "open" });
      const mid = document.createElement("div");
      outer.appendChild(mid);
      mid.attachShadow({ mode: "open" }).innerHTML = ${JSON.stringify(
        `<a href="${href}">Privacy Policy</a>`,
      )};
    </script>`;
    expect(await find(body)).toBe(href);
  });

  it("prefers a light-DOM link even when the shadow host comes first", async () => {
    const shadow = "https://example.com/shadow-policy";
    const result = await find(shadowHost("h", `<a href="${shadow}">Privacy Policy</a>`) + LIGHT);
    expect(result).toBe(VALID);
  });

  it("skips a link in a closed shadow root without throwing", async () => {
    const result = await find(
      shadowHost("h", `<a href="https://example.com/closed">Privacy Policy</a>`, "closed") + LIGHT,
    );
    expect(result).toBe(VALID);
  });

  it("skips a javascript: link inside an open shadow root", async () => {
    const result = await find(
      shadowHost("h", `<a href="javascript:void(0)">Privacy Policy</a>`) + LIGHT,
    );
    expect(result).toBe(VALID);
  });

  it("finds a link in a shadow root inside the scoped modal", async () => {
    const href = "https://example.com/modal-shadow-policy";
    const result = await find(
      `<div id="modal"><div id="h"></div><script>
        document.getElementById("h").attachShadow({ mode: "open" }).innerHTML = ${JSON.stringify(
          `<a href="${href}">Privacy Policy</a>`,
        )};
      </script></div>`,
      "#modal",
    );
    expect(result).toBe(href);
  });

  it("does not return a shadow link outside the scoped modal", async () => {
    const result = await find(
      shadowHost("h", `<a href="https://example.com/outside">Privacy Policy</a>`) +
        `<div id="modal"><a href="${VALID}">Privacy Policy</a></div>`,
      "#modal",
    );
    expect(result).toBe(VALID);
  });
});
