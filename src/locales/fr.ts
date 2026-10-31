import type { LocaleData } from "./types.js";

export const fr: LocaleData = {
  code: "fr",
  buttons: {
    // "continuer" removed: too ambiguous ("Continuer sans accepter" must stay reject)
    accept:
      /\b(accepter|acceptez|tout accepter|autoriser|tout autoriser|autoriser tout|j'accepte|d'accord|valider|confirmer)\b/i,
    reject:
      /\b(refus|refuser|tout refuser|rejeter|tout rejeter|non merci|continuer sans accepter|n[eé]cessaires? uniquement|essentiels? uniquement|que les n[eé]cessaires?)\b/i,
    preferences:
      /\b(param[eè]tres|pr[eé]f[eé]rences|personnaliser|g[eé]rer|choisir|enregistrer|sauvegarder)\b/i,
  },
  indirectReject: [/\bcontinuer\s+sans\b/i, /\bsans\s+(accepter|consentir|cookies)\b/i],
  privacy: {
    urlStems: [
      "politique[_-]?(de[_-])?confidentialit",
      "politique[_-]?(de[_-])?vie[_-]?priv",
      "confidentialit",
      "vie[_-]?priv",
      "mentions[_-]?l.gales",
    ],
    textStems: [
      "politique\\s+(de\\s+)?confidentialit",
      "politique\\s+(de\\s+)?vie\\s+priv",
      "confidentialit",
      "vie\\s+priv",
      "mentions?\\s+l.gales?",
    ],
  },
  info: {
    purposes: [/finalit[eé]/i, /objectif/i, /utilisation/i],
    "third-parties": [/partenaire/i, /tiers/i, /sous.traitant/i],
    withdrawal: [/retrait/i, /retirer/i, /changer/i],
  },
};
