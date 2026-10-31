import type { LocaleData } from "./types.js";

export const en: LocaleData = {
  code: "en",
  buttons: {
    // "continue" removed: too ambiguous ("Continue without accepting" must stay reject)
    accept:
      /\b(accept|accept all|allow all|enable all|agree|ok|i accept|i agree|i consent|allow cookies)\b/i,
    reject:
      /\b(refuse|reject|reject all|deny|decline|decline all|no thanks|skip|opt[- ]out|continue without|necessary only|essential only|only necessary|only essential)\b/i,
    preferences:
      /\b(manage|customize|customise|settings|options|choose|configure|save preferences|save settings|save my choices)\b/i,
  },
  indirectReject: [
    /\bcontinue\s+without\b/i,
    /\bproceed\s+without\b/i,
    /\bwithout\s+(accepting|accept|consent|consenting)\b/i,
  ],
  privacy: {
    urlStems: ["privacy[_-]?polic", "data[_-]?protection", "data[_-]?privacy"],
    textStems: ["privacy\\s+polic", "data\\s+protection"],
  },
  info: {
    purposes: [/purpose/i],
    "third-parties": [/third.part/i, /vendor/i],
    withdrawal: [/withdraw/i, /revok/i, /modif/i, /chang/i],
  },
};
