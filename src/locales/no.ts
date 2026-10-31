import type { LocaleData } from "./types.js";

// Bokmål and Nynorsk in one. Anchors: æ ø å are not `\w`, so stems that touch them
// use Unicode-aware lookarounds (`u` flag) instead of `\b`. Verb stems take no
// trailing anchor so inflections match (godtar); short stems (nei takk, endre) keep
// both anchors; `innstilling` and `tredjepart` are unanchored so compounds
// (Cookieinnstillinger) match. Withdrawal uses a gap pattern so "trekke samtykket
// tilbake" matches. Beyond the observed wording this vocabulary is assumed
// (Nynorsk entirely) and needs native-speaker review.
export const no: LocaleData = {
  code: "no",
  buttons: {
    accept: /(?<![\p{L}\p{M}])(godta|aksepter|tillat alle)/iu,
    reject:
      /(?<![\p{L}\p{M}])(avvis|avslå|kun nødvendige|bare nødvendige|berre naudsynte|nei takk(?![\p{L}\p{M}])|fortsett uten å godta|fortset utan å godta)/iu,
    // Imperative only: `tilpass`/`administrer` also anchor the end, so purpose descriptions
    // rendered as buttons ("personlig tilpasset annonsering") are not taken for settings.
    preferences: /innstilling|(?<![\p{L}\p{M}])(administrer|tilpass)(?![\p{L}\p{M}])/iu,
    // "Tilpass eller avvis", "Avvis eller tilpass": preferences verb + eller + reject verb, either order.
    combinedPreferences:
      /(?<![\p{L}\p{M}])(tilpass|administrer)\s+eller\s+(avvis|avslå)|(?<![\p{L}\p{M}])(avvis|avslå)\s+eller\s+(tilpass|administrer)/iu,
  },
  indirectReject: [
    /(?<![\p{L}\p{M}])fortsett\s+uten\s+å\s+godta/iu,
    /(?<![\p{L}\p{M}])fortset\s+utan\s+å\s+godta/iu,
  ],
  privacy: {
    // ASCII only: link.href is percent-encoded (æ = %C3%A6). The text stems are narrow on
    // purpose: a bare "personvern" would also match Personverninnstillinger / Personvernombud.
    urlStems: ["personvernerkl(ae|%c3%a6)ring", "personvernpolicy"],
    textStems: [
      "personvernerkl[aæ]ring",
      "personvernfr[aå]segn",
      "personvernpolicy",
      "personvern-?\\s+og\\s",
      "personopplysning\\w*-?\\s*policy",
    ],
  },
  info: {
    purposes: [/formål/iu, /føremål/iu],
    "third-parties": [/tredjepart/i, /partner(e|ne)(?![\p{L}\p{M}])/iu, /partnar/i],
    withdrawal: [
      /(?<![\p{L}\p{M}])endre(r)?(?![\p{L}\p{M}])/iu,
      /(?<![\p{L}\p{M}])trekk\w*\s+(\S+\s+){0,3}tilbake/iu,
    ],
  },
};
