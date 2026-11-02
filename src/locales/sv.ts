import type { LocaleData } from "./types.js";

// Anchors: ä å ö are not `\w`, so stems that touch them use Unicode-aware
// lookarounds (`u` flag) instead of `\b`. Verb stems take no trailing anchor so
// inflections match (godkänner); short stems (neka, ändra) keep both anchors;
// `inställning` is unanchored so compounds (Cookieinställningar) match. Beyond the
// observed Blocket wording this vocabulary is assumed and needs native-speaker review.
export const sv: LocaleData = {
  code: "sv",
  buttons: {
    accept: /(?<![\p{L}\p{M}])(godkänn|acceptera alla|tillåt alla)/iu,
    reject:
      /(?<![\p{L}\p{M}])(avvisa|neka(?![\p{L}\p{M}])|endast nödvändiga|nej tack(?![\p{L}\p{M}])|fortsätt utan att godkänn)/iu,
    // Imperative only: the end is anchored so "hanterar", "anpassade annonser" are not settings.
    preferences: /inställning|(?<![\p{L}\p{M}])(hantera|anpassa)(?![\p{L}\p{M}])/iu,
    // "Hantera eller avvisa", "Avvisa eller anpassa": preferences verb + eller + reject verb, either order.
    combinedPreferences:
      /(?<![\p{L}\p{M}])(hantera|anpassa)\s+eller\s+(avvisa|neka)|(?<![\p{L}\p{M}])(avvisa|neka)\s+eller\s+(hantera|anpassa)/iu,
  },
  indirectReject: [/(?<![\p{L}\p{M}])fortsätt\s+utan\s+att\s+godkänn/iu],
  privacy: {
    // ASCII only: link.href is percent-encoded (ä = %C3%A4).
    urlStems: ["integritetspolicy", "personuppgiftspolicy"],
    textStems: ["personuppgifts\\s*-?\\s*och\\s", "personuppgiftspolicy", "integritetspolicy"],
  },
  info: {
    purposes: [/ändamål/iu],
    "third-parties": [/\btredje\s+part/i, /samarbetspartner/i, /\bvåra\s+partners/i],
    withdrawal: [
      /(?<![\p{L}\p{M}])ändra(r|s)?(?![\p{L}\p{M}])/iu,
      /(?<![\p{L}\p{M}])återkall/iu,
      /\bdra\s+tillbaka/i,
    ],
  },
};
