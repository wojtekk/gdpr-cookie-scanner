export interface LinkCandidate {
  href: string;
  text: string;
  inShadow: boolean;
}

/** Nordic words for "settings": links carrying them are settings pages, not policies. */
const NORDIC_SETTINGS = /asetukset|inst[aä]llning|innstilling|indstilling/i;
const SETTINGS_HOST = /settings/i;

/**
 * Canonical form of link text for matching: NFC, invisible characters removed
 * (soft hyphen, zero-width space/joiners, word joiner, BOM), Unicode dashes mapped
 * to "-", all whitespace (including NBSP) collapsed to single spaces, trimmed.
 */
function normalizeLinkText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isSkippedHref(href: string): boolean {
  const normalizedHref = href.toLowerCase();
  return (
    !href ||
    normalizedHref.startsWith("javascript:") ||
    normalizedHref.startsWith("data:") ||
    normalizedHref.startsWith("vbscript:") ||
    href === "#"
  );
}

function isSettingsLink(href: string, text: string): boolean {
  if (NORDIC_SETTINGS.test(text)) return true;
  let hostAndPath = href;
  let host = "";
  try {
    const url = new URL(href);
    host = url.hostname;
    hostAndPath = url.host + url.pathname;
  } catch {
    // relative or malformed href: test it as-is
  }
  try {
    hostAndPath = decodeURI(hostAndPath);
  } catch {
    // malformed percent-encoding: keep the raw string
  }
  hostAndPath = hostAndPath.normalize("NFC");
  return NORDIC_SETTINGS.test(hostAndPath) || SETTINGS_HOST.test(host);
}

/**
 * Pick the privacy policy URL from collected links. Light-DOM links win over
 * shadow-DOM ones; within each group the first match in document order wins.
 */
export function selectPrivacyPolicyUrl(
  links: LinkCandidate[],
  urlPatterns: string[],
  textPatterns: string[],
): string | null {
  const urlRes = urlPatterns.map((p) => new RegExp(p, "i"));
  const textRes = textPatterns.map((p) => new RegExp(p, "i"));

  const matches = (link: LinkCandidate): boolean => {
    if (typeof link.href !== "string" || isSkippedHref(link.href)) return false;
    const text = normalizeLinkText(link.text);
    if (isSettingsLink(link.href, text)) return false;
    return urlRes.some((r) => r.test(link.href)) || textRes.some((r) => r.test(text));
  };

  const light = links.find((l) => !l.inShadow && matches(l));
  if (light) return light.href;
  return links.find((l) => l.inShadow && matches(l))?.href ?? null;
}
