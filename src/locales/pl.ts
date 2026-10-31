import type { LocaleData } from "./types.js";

export const pl: LocaleData = {
  code: "pl",
  buttons: {
    // No \b anchors: Polish words often end in non-ASCII characters (ć, ę, ó)
    // which are outside JS \w, so \b would not match at the word end.
    // Negative lookbehind prevents "zgadzam się" from matching inside "nie zgadzam się".
    accept: /zaakceptuj( wszystkie)?|(?<!nie\s)zgadzam si[eę]|akceptuj[eę]/i,
    reject: /odrzuć( wszystkie)?|nie zgadzam si[eę]|odm[oó]w/i,
    preferences: /ustawienia|dostosuj|zarz[aą]dzaj|opcje|skonfiguruj|preferencje/i,
  },
  indirectReject: [],
  privacy: { urlStems: [], textStems: [] },
  info: { purposes: [], "third-parties": [], withdrawal: [] },
};
