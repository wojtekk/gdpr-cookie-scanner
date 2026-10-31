import type { Page } from "playwright";
import type { ConsentModal, ConsentButton, ConsentCheckbox, ConsentButtonType } from "../types.js";
import { analyzeButtonWording } from "../analyzers/wording.js";
import type { ScanOptions } from "../types.js";
import { aggregateLocales } from "../locales/index.js";
import { selectPrivacyPolicyUrl, type LinkCandidate } from "./privacy-link.js";

const LOCALE_VOCAB = aggregateLocales();

/**
 * Selectors for well-known CMP platforms.
 * These are precise enough that DOM presence alone is a reliable signal —
 * no visibility check required. Some CMPs (e.g. Axeptio) inject their
 * container as display:none and reveal it after JS initialisation, so
 * isVisible() would incorrectly skip them.
 */
const CMP_SELECTORS = [
  "#axeptio_overlay",
  "#axeptio-root",
  "#CybotCookiebotDialog",
  "#onetrust-consent-sdk",
  "#onetrust-banner-sdk",
  ".didomi-popup-container",
  ".didomi-consent-popup",
  "#didomi-host",
  "#tarteaucitronRoot",
  "#tarteaucitron",
  "#usercentrics-root",
  "#sp-cc",
  "#gdpr-consent-tool-wrapper",
  ".cc-banner",
  ".cc-window",
  "#cookieConsent",
  "#cookie-consent",
  "#cookie-banner",
  "#cookie-notice",
  "#cookie-law-info-bar",
];

/**
 * Generic heuristic selectors.
 * These are broad enough to match unrelated elements, so a visibility
 * check is required to avoid false positives.
 */
const HEURISTIC_SELECTORS = [
  "[class*='cookie'][class*='banner']",
  "[class*='cookie'][class*='modal']",
  "[class*='cookie'][class*='popup']",
  "[class*='consent'][class*='banner']",
  "[class*='consent'][class*='modal']",
  "[id*='cookie'][id*='banner']",
  "[id*='cookie'][id*='modal']",
  "[id*='consent']",
  "[aria-label*='cookie' i]",
  "[aria-label*='consent' i]",
  "[aria-label*='cookies' i]",
  "[role='dialog'][aria-label*='cookie' i]",
  "[role='alertdialog']",
];

/**
 * Find a privacy policy link within a given scope (modal selector) or the full page.
 * Returns the absolute URL of the first matching link, or null.
 */
export async function findPrivacyPolicyUrl(
  page: Page,
  scopeSelector?: string,
): Promise<string | null> {
  // Collect only inside the page; matching happens Node-side in selectPrivacyPolicyUrl.
  const links = await page
    .evaluate((scope): LinkCandidate[] => {
      const root: Element | Document = scope
        ? (document.querySelector(scope) ?? document)
        : document;
      const out: LinkCandidate[] = [];
      const collect = (node: Element | Document | ShadowRoot, inShadow: boolean): void => {
        for (const link of node.querySelectorAll("a[href]")) {
          out.push({
            href: (link as HTMLAnchorElement).href ?? "",
            text: link.textContent ?? "",
            inShadow,
          });
        }
        const hosts: Element[] = [];
        if (node instanceof Element && node.shadowRoot) hosts.push(node);
        for (const el of node.querySelectorAll("*")) {
          if (el.shadowRoot) hosts.push(el);
        }
        for (const host of hosts) collect(host.shadowRoot as ShadowRoot, true);
      };
      collect(root, false);
      return out;
    }, scopeSelector ?? null)
    .catch(() => null);
  if (!links) return null;
  return selectPrivacyPolicyUrl(links, LOCALE_VOCAB.privacyUrl, LOCALE_VOCAB.privacyText);
}

/**
 * Always return all locale patterns regardless of the page's declared language.
 *
 * Restricting patterns to the detected language was causing misses when a
 * page declares lang="en" but its CMP displays buttons in the user's locale
 * (e.g. a French CMP on an English-declared page). Since all patterns are
 * specific to cookie-consent wording, cross-locale false positives are rare.
 * The `lang` parameter is kept for API compatibility but is no longer used.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resolveButtonPatterns(_lang: string | null): {
  accept: RegExp[];
  reject: RegExp[];
  preferences: RegExp[];
} {
  return {
    accept: LOCALE_VOCAB.accept,
    reject: LOCALE_VOCAB.reject,
    preferences: LOCALE_VOCAB.preferences,
  };
}

/**
 * Collapse any whitespace sequence (including &nbsp; / \u00A0, \n, \t, …)
 * into a single ASCII space and strip leading/trailing whitespace.
 * Also inserts spaces at camelCase boundaries so that icon component names
 * leaked into textContent (e.g. "accepterArrowRightIcon") do not break the
 * word-boundary anchors used in button patterns.
 */
function normalizeText(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // "accepterArrowRightIcon" → "accepter Arrow Right Icon"
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classify a consent button label for a given page language.
 * `lang` should be the BCP 47 primary subtag (e.g. "de", "fr") read from
 * <html lang>, or null when the language is undetermined.
 */
export function classifyButtonText(text: string, lang: string | null): ConsentButtonType {
  const { accept, reject, preferences } = resolveButtonPatterns(lang);
  return classifyButtonType(normalizeText(text), accept, reject, preferences);
}

export async function detectConsentModal(page: Page, options: ScanOptions): Promise<ConsentModal> {
  let foundSelector: string | null = null;

  // Step 1 — specific CMP selectors: presence in DOM is sufficient.
  // Some CMPs (e.g. Axeptio) insert their container as display:none and
  // animate it in after JS initialisation. Requiring isVisible() would
  // skip them and fall through to a wrong generic selector.
  // Once the element is found we wait briefly (up to 3 s) for it to
  // become visible so button extraction sees an interactive state.
  for (const selector of CMP_SELECTORS) {
    try {
      const element = await page.$(selector);
      if (!element) continue;
      await page.waitForSelector(selector, { state: "visible", timeout: 3000 }).catch(() => {});
      foundSelector = selector;
      break;
    } catch {
      continue;
    }
  }

  // Step 2 — generic heuristics: require visibility to avoid false positives.
  if (!foundSelector) {
    for (const selector of HEURISTIC_SELECTORS) {
      try {
        const element = await page.$(selector);
        if (!element) continue;
        const isVisible = await element.isVisible();
        if (isVisible) {
          foundSelector = selector;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // Fallback: look for any large fixed/sticky element with cookie-related text
  if (!foundSelector) {
    foundSelector = await page.evaluate(() => {
      const candidates = document.querySelectorAll("div, section, aside, dialog");
      const keywords = /cookie|consent|consentement|rgpd|gdpr|privacy|vie priv/i;

      for (const el of candidates) {
        const style = window.getComputedStyle(el);
        const isFixed = style.position === "fixed" || style.position === "sticky";
        const text = el.textContent ?? "";
        const hasCookieText = keywords.test(text);
        const isLargeEnough = el.getBoundingClientRect().width > 200;

        if (isFixed && hasCookieText && isLargeEnough) {
          // Generate a unique selector
          if (el.id) return `#${el.id}`;
          const classes = Array.from(el.classList).slice(0, 2).join(".");
          if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
        }
      }
      return null;
    });
  }

  if (!foundSelector) {
    return {
      detected: false,
      selector: null,
      text: "",
      buttons: [],
      checkboxes: [],
      hasGranularControls: false,
      layerCount: 0,
      screenshotPath: null,
      privacyPolicyUrl: null,
    };
  }

  // Detect the page's declared language for locale-aware button classification
  const rawLang = await page.$eval("html", (el) => el.lang ?? "").catch(() => "");
  const pageLang = rawLang.split("-")[0].toLowerCase() || null;

  // Extract modal text
  const modalText = await page.$eval(foundSelector, (el) => el.textContent ?? "").catch(() => "");

  // Find all buttons and interactive elements within the modal
  const buttons = await extractButtons(page, foundSelector, pageLang);

  // Find checkboxes / toggles
  const checkboxes = await extractCheckboxes(page, foundSelector);

  // Detect if there are nested layers (e.g., "more options" behind a click)
  const hasGranularControls =
    checkboxes.length > 0 || buttons.some((b) => b.type === "preferences");

  // Look for a privacy policy link inside the modal
  const privacyPolicyUrl = await findPrivacyPolicyUrl(page, foundSelector);

  return {
    detected: true,
    selector: foundSelector,
    text: modalText.trim().replace(/\s+/g, " "),
    buttons,
    checkboxes,
    hasGranularControls,
    layerCount: hasGranularControls ? 2 : 1,
    screenshotPath: null,
    privacyPolicyUrl,
  };
}

async function extractButtons(
  page: Page,
  modalSelector: string,
  lang: string | null,
): Promise<ConsentButton[]> {
  const { accept, reject, preferences } = resolveButtonPatterns(lang);
  const buttonEls = await page.$$(
    [
      `${modalSelector} button`,
      `${modalSelector} [role="button"]`,
      `${modalSelector} input[type="button"]`,
      `${modalSelector} input[type="submit"]`,
      `${modalSelector} a[href="#"]`,
      `${modalSelector} a[href=""]`,
      `${modalSelector} a[href^="javascript:"]`,
      `${modalSelector} a:not([href])`,
    ].join(", "),
  );

  const buttons: ConsentButton[] = [];

  for (const el of buttonEls) {
    try {
      const rawText = normalizeText((await el.textContent()) ?? "");
      // Fallbacks for icon-only buttons and <input type="submit"> whose text lives in `value`
      const ariaLabel = normalizeText((await el.getAttribute("aria-label")) ?? "");
      const valueAttr = normalizeText((await el.getAttribute("value")) ?? "");
      const titleAttr = normalizeText((await el.getAttribute("title")) ?? "");
      const text = rawText || ariaLabel || valueAttr || titleAttr;
      if (!text) continue;

      const isVisible = await el.isVisible();
      const box = await el.boundingBox();

      const computedStyle = await el.evaluate((node) => {
        const style = window.getComputedStyle(node as Element);
        return {
          fontSize: parseFloat(style.fontSize),
          backgroundColor: style.backgroundColor,
          color: style.color,
        };
      });

      const type = classifyButtonType(text, accept, reject, preferences);

      // Build a unique selector for this button.
      // Prefer a class-based selector only when it uniquely identifies the element;
      // otherwise fall back to Playwright's :has-text() pseudo-selector so that
      // buttons sharing the same CSS classes (e.g. design-system components) can
      // still be clicked individually.
      const selector = await el.evaluate((node) => {
        const el = node as Element;
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const classes = Array.from(el.classList).slice(0, 3).join(".");
        if (classes && document.querySelectorAll(`${tag}.${classes}`).length === 1) {
          return `${tag}.${classes}`;
        }
        // :has-text() is a Playwright-specific selector supported by page.click()
        const escapedText = (el.textContent?.trim() ?? "")
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .substring(0, 40);
        if (escapedText) return `${tag}:has-text("${escapedText}")`;
        return classes ? `${tag}.${classes}` : tag;
      });

      const contrastRatio = computeContrastRatio(
        computedStyle.color,
        computedStyle.backgroundColor,
      );

      buttons.push({
        type,
        text,
        selector,
        isVisible,
        boundingBox: box,
        fontSize: computedStyle.fontSize || null,
        backgroundColor: computedStyle.backgroundColor,
        textColor: computedStyle.color,
        contrastRatio,
        clickDepth: 1,
      });
    } catch {
      continue;
    }
  }

  return buttons;
}

async function extractCheckboxes(page: Page, modalSelector: string): Promise<ConsentCheckbox[]> {
  return page
    .evaluate((selector) => {
      const modal = document.querySelector(selector);
      if (!modal) return [];

      const checkboxes: ConsentCheckbox[] = [];
      const inputs = modal.querySelectorAll(
        'input[type="checkbox"], input[type="radio"], [role="switch"], [role="checkbox"]',
      );

      for (const input of inputs) {
        const el = input as HTMLInputElement;
        // Find associated label
        let label = "";
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          label = labelEl?.textContent?.trim() ?? "";
        }
        if (!label) {
          const parent = el.closest("label") ?? el.parentElement;
          label = parent?.textContent?.trim() ?? "";
        }

        checkboxes.push({
          name: el.name || el.id || "",
          label: label.substring(0, 100),
          isCheckedByDefault: el.checked || el.getAttribute("aria-checked") === "true",
          category: "unknown", // will be classified later
          selector: el.id ? `#${el.id}` : "",
        });
      }

      return checkboxes;
    }, modalSelector)
    .catch(() => [] as ConsentCheckbox[]);
}

function classifyButtonType(
  text: string,
  accept: RegExp[],
  reject: RegExp[],
  preferences: RegExp[],
): ConsentButtonType {
  // Reject is tested first: phrases like "continuer sans accepter" contain "accepter"
  // which would otherwise match the accept pattern before reaching the reject pattern.
  if (reject.some((p) => p.test(text))) return "reject";
  if (accept.some((p) => p.test(text))) return "accept";
  if (preferences.some((p) => p.test(text))) return "preferences";
  // Close buttons: word-form match OR standalone symbol (× ✕ ✗ ✖ ✘)
  if (
    /\b(close|fermer|schlie[ßs]en|cerrar|chiudi|sluiten|zamknij|fechar)\b/i.test(text) ||
    /^[×✕✗✖✘]$/.test(text.trim())
  )
    return "close";
  return "unknown";
}

/**
 * Basic contrast ratio computation from RGB strings.
 * Returns null if colors cannot be parsed.
 */
export function computeContrastRatio(fg: string, bg: string): number | null {
  const fgRgb = parseRgb(fg);
  const bgRgb = parseRgb(bg);
  if (!fgRgb || !bgRgb) return null;

  const fgL = relativeLuminance(fgRgb);
  const bgL = relativeLuminance(bgRgb);
  const lighter = Math.max(fgL, bgL);
  const darker = Math.min(fgL, bgL);
  return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function parseRgb(color: string): [number, number, number] | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
