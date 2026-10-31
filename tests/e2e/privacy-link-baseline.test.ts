import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { chromium, type Browser } from "playwright";
import { findPrivacyPolicyUrl } from "../../src/scanner/consent-modal.js";

// Characterization baseline for findPrivacyPolicyUrl. One page per case, each with a
// non-matching decoy link first (a single page with all links would only ever return the
// first match).

const NEUTRAL = "https://example.com/page";
const DECOY = '<a href="https://example.com/about">About us</a>';

describe("findPrivacyPolicyUrl baseline", () => {
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
      await page.setContent(`<html><body>${DECOY}${body}</body></html>`);
      return await findPrivacyPolicyUrl(page, scope);
    } finally {
      await page.close();
    }
  }

  describe("text matches", () => {
    it.each([
      "Privacy Policy",
      "Politique de confidentialité",
      "Politique de vie privée",
      "Mentions légales",
      "Datenschutzerklärung",
      "Política de privacidad",
      "Data protection",
    ])("%s", async (text) => {
      expect(await find(`<a href="${NEUTRAL}">${text}</a>`)).toBe(NEUTRAL);
    });
  });

  describe("URL-only matches", () => {
    it.each(["/privacy-policy", "/datenschutz", "/data-privacy"])("%s", async (path) => {
      const href = `https://example.com${path}`;
      expect(await find(`<a href="${href}">Read this</a>`)).toBe(href);
    });
  });

  describe("negatives", () => {
    it("ignores unrelated link text", async () => {
      expect(await find(`<a href="${NEUTRAL}">Terms of service</a>`)).toBeNull();
    });

    it("skips a javascript: link and returns the valid one after it", async () => {
      const valid = "https://example.com/legal";
      const result = await find(
        `<a href="javascript:void(0)">Privacy Policy</a><a href="${valid}">Privacy Policy</a>`,
      );
      expect(result).toBe(valid);
    });
  });

  describe("pins of today's behaviour", () => {
    // On setContent pages the href resolves to "about:blank#", so the `href === "#"` guard never fires.
    it('href="#" is not skipped when the browser resolves it to a full URL', async () => {
      const result = await find('<a href="#">Privacy Policy</a>');
      expect(result).toBe("about:blank#");
    });

    it("returns a link whose URL path is nested under another section", async () => {
      const href = "https://example.com/account/settings/privacy-policy";
      expect(await find(`<a href="${href}">Privacy Policy</a>`)).toBe(href);
    });

    it("matches text containing extra words", async () => {
      expect(await find(`<a href="${NEUTRAL}">Privacy Policy &amp; Cookie Settings</a>`)).toBe(
        NEUTRAL,
      );
    });

    it("returns a settings link placed before the policy link (pre-existing false positive)", async () => {
      const settings = "https://example.com/settings";
      const policy = "https://example.com/policy";
      const result = await find(
        `<a href="${settings}">Paramètres de confidentialité</a><a href="${policy}">Politique de confidentialité</a>`,
      );
      expect(result).toBe(settings);
    });
  });

  describe("scope", () => {
    it("ignores a policy link outside the scope selector", async () => {
      const inside = "https://example.com/inside";
      const result = await find(
        `<a href="https://example.com/outside">Privacy Policy</a>` +
          `<div id="modal"><a href="${inside}">Datenschutz</a></div>`,
        "#modal",
      );
      expect(result).toBe(inside);
    });

    it("returns null when the only policy link is outside the scope", async () => {
      const result = await find(
        `<a href="${NEUTRAL}">Privacy Policy</a><div id="modal"><a href="https://example.com/x">Close</a></div>`,
        "#modal",
      );
      expect(result).toBeNull();
    });

    it("falls back to the whole document when the scope matches nothing", async () => {
      expect(await find(`<a href="${NEUTRAL}">Privacy Policy</a>`, "#does-not-exist")).toBe(
        NEUTRAL,
      );
    });
  });
});
