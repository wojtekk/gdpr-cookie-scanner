import type { LocaleData } from "./types.js";

export const de: LocaleData = {
  code: "de",
  buttons: {
    accept:
      /\b(akzeptieren|alle akzeptieren|zustimmen|einverstanden|annehmen|alle annehmen|ich stimme zu)\b/i,
    reject: /\b(ablehnen|alle ablehnen|abweisen|nicht zustimmen|nein danke|nur notwendige)\b/i,
    preferences: /\b(einstellungen|anpassen|verwalten|konfigurieren|ausw[äa]hlen|mehr optionen)\b/i,
  },
  indirectReject: [/\bweiter\s+ohne\b/i, /\bohne\s+(akzeptieren|zustimmen)\b/i],
  privacy: { urlStems: ["datenschutz"], textStems: ["datenschutz"] },
  info: { purposes: [], "third-parties": [], withdrawal: [] },
};
