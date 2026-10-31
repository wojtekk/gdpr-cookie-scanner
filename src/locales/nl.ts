import type { LocaleData } from "./types.js";

export const nl: LocaleData = {
  code: "nl",
  buttons: {
    accept: /\b(accepteren|alles accepteren|akkoord|ik ga akkoord|alles toestaan)\b/i,
    reject: /\b(weigeren|alles weigeren|afwijzen|nee bedankt|alleen noodzakelijke)\b/i,
    preferences: /\b(instellingen|aanpassen|beheren|instellen|voorkeuren)\b/i,
  },
  indirectReject: [/\bvervolgenen?\s+zonder\b/i, /\bzonder\s+(accepteren|toestemming)\b/i],
  privacy: { urlStems: [], textStems: [] },
  info: { purposes: [], "third-parties": [], withdrawal: [] },
};
