import type { LocaleData } from "./types.js";

export const pt: LocaleData = {
  code: "pt",
  buttons: {
    accept: /\b(aceitar|aceitar tudo|aceito|concordo)\b/i,
    reject: /\b(rejeitar|rejeitar tudo|recusar|n[aã]o obrigado)\b/i,
    preferences:
      /\b(configura[çc][oõ]es|personalizar|gerir|op[çc][oõ]es|defini[çc][oõ]es|prefer[eê]ncias)\b/i,
  },
  indirectReject: [],
  privacy: { urlStems: [], textStems: [] },
  info: { purposes: [], "third-parties": [], withdrawal: [] },
};
