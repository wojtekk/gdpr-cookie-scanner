import type { LocaleData } from "./types.js";

export const es: LocaleData = {
  code: "es",
  buttons: {
    accept: /\b(aceptar|aceptar todo|acepto|estoy de acuerdo|permitir todo)\b/i,
    reject:
      /\b(rechazar|rechazar todo|denegar|no gracias|continuar sin aceptar|solo necesarias?)\b/i,
    preferences: /\b(ajustes|configurar|gestionar|opciones|personalizar|preferencias)\b/i,
  },
  indirectReject: [/\bcontinuar\s+sin\b/i, /\bsin\s+(aceptar|consentir)\b/i],
  privacy: { urlStems: ["privacidad"], textStems: ["privacidad"] },
  info: { purposes: [], "third-parties": [], withdrawal: [] },
};
