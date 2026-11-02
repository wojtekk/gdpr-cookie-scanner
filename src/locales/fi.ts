import type { LocaleData } from "./types.js";

// Anchors: `\b` only where the adjacent character is ASCII. Verb stems take no
// trailing anchor so inflections match; `asetukset` is unanchored so compounds
// (Evästeasetukset) match. Beyond the observed Tori wording this vocabulary is
// assumed and needs native-speaker review.
export const fi: LocaleData = {
  code: "fi",
  buttons: {
    accept: /\b(hyväksy|salli kaikki)/i,
    reject:
      /\bhylkää|\bkieltäydy|\bvain (välttämättömät|pakolliset)|\bei kiitos\b|\bjatka ilman hyväksy/i,
    // Imperative only, end anchored: "hallitsevat", "muokkaamme", "mukautan" are running text.
    // `u` flag for the Unicode-aware lookahead (ä ö are not `\w`).
    preferences: /asetukset|\b(hallitse|mukauta|muokkaa)(?![\p{L}\p{M}])/iu,
    // "Muokkaa tai kiellä", "Hylkää tai muokkaa": preferences verb + tai + reject verb, either order.
    combinedPreferences:
      /\b(muokkaa|hallitse|mukauta)\s+tai\s+(kiellä|hylkää|kieltäydy)|\b(hylkää|kiellä|kieltäydy)\s+tai\s+(muokkaa|hallitse|mukauta)/i,
  },
  indirectReject: [/\bjatka\s+ilman\s+hyväksy/i],
  privacy: {
    // ASCII only: link.href is percent-encoded (ä = %C3%A4).
    urlStems: ["tietosuojak(a|%c3%a4)yt(a|%c3%a4)n", "tietosuojaseloste", "rekisteriseloste"],
    textStems: [
      "tietosuojak[aä]yt[aä]n",
      "tietosuoja\\s*-?\\s*ja\\s",
      "tietosuojaseloste",
      "rekisteriseloste",
    ],
  },
  info: {
    purposes: [/tarkoitu/i],
    "third-parties": [/kumppan/i, /osapuol/i],
    withdrawal: [/\bmuutta/i, /\bperu(u|ut)/i],
  },
};
