import type { LocaleData } from "./types.js";

export const it: LocaleData = {
  code: "it",
  buttons: {
    accept: /\b(accetta|accetta tutto|accetto|acconsento|acconsento a tutto|consenti tutto)\b/i,
    reject: /\b(rifiuta|rifiuta tutto|nega|no grazie|solo necessari)\b/i,
    preferences: /\b(impostazioni|personalizza|gestisci|opzioni|configura|preferenze)\b/i,
  },
  indirectReject: [/\bcontinua\s+senza\b/i, /\bsenza\s+(accettare|consenso)\b/i],
  privacy: { urlStems: [], textStems: [] },
  info: { purposes: [], "third-parties": [], withdrawal: [] },
};
