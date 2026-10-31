import type { LocaleData } from "./types.js";

// Anchors: æ ø å are not `\w`, so stems that touch them use Unicode-aware
// lookarounds (`u` flag) instead of `\b`. Verb stems take no trailing anchor so
// inflections match (godkender); short stems (nej tak, ændre) keep both anchors;
// `indstilling` is unanchored so compounds (Cookieindstillinger) match, and the
// partner stem has a trailing anchor only, so `reklamepartnere` matches while
// German `Partnerentwicklung` does not. Beyond the observed wording this vocabulary
// is assumed and needs native-speaker review.
export const da: LocaleData = {
  code: "da",
  buttons: {
    accept: /(?<![\p{L}\p{M}])(tillad alle|accepter alle|godkend)/iu,
    reject:
      /(?<![\p{L}\p{M}])(afvis|fravælg|kun nødvendige|nej tak(?![\p{L}\p{M}])|fortsæt uden at accept)/iu,
    // "udvalgte": "Tillad udvalgte" is a preferences choice, not accept-all.
    // `administrer`/`tilpas` also anchor the end ("tilpasset annoncering" is not settings).
    // `udvalgte` is already a whole word; a trailing anchor cannot separate "Tillad udvalgte"
    // from "udvalgte annoncer".
    preferences: /indstilling|(?<![\p{L}\p{M}])((administrer|tilpas)(?![\p{L}\p{M}])|udvalgte)/iu,
    // "Tilpas eller afvis", "Afvis eller tilpas": preferences verb + eller + reject verb, either order.
    combinedPreferences:
      /(?<![\p{L}\p{M}])(tilpas|administrer)\s+eller\s+(afvis|fravælg)|(?<![\p{L}\p{M}])(afvis|fravælg)\s+eller\s+(tilpas|administrer)/iu,
  },
  indirectReject: [/(?<![\p{L}\p{M}])fortsæt\s+uden\s+at\s+accept/iu],
  privacy: {
    // ASCII only: link.href is percent-encoded (æ = %C3%A6). The text stems are narrow on
    // purpose: bare "privatliv" would match Privatlivsindstillinger, and bare
    // "personoplysninger"/"persondata" would match "Slet persondata" and
    // "Anmod om indsigt i personoplysninger"; they only count as policy compounds or phrases.
    urlStems: [
      "privatlivspolitik",
      "privatlivserkl(ae|%c3%a6)ring",
      "persondatapolitik",
      "cookiepolitik",
    ],
    textStems: [
      "privatlivspolitik",
      "privatlivserkl[aæ]ring",
      "privatlivs-?\\s+og\\s",
      "persondatapolitik",
      "personoplysning\\w*-?\\s*politik",
      "cookiepolitik",
      "behandler\\s+(dine\\s+)?(personoplysninger|persondata)",
    ],
  },
  info: {
    purposes: [/(?<![\p{L}\p{M}])formål/iu],
    "third-parties": [/tredjepart/i, /partner(e|ne)(?![\p{L}\p{M}])/iu],
    withdrawal: [
      /(?<![\p{L}\p{M}])ændre(r)?(?![\p{L}\p{M}])/iu,
      /(?<![\p{L}\p{M}])tilbagekald/iu,
      /(?<![\p{L}\p{M}])træk\w*\s+(\S+\s+){0,3}tilbage/iu,
    ],
  },
};
