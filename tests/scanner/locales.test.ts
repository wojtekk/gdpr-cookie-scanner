import { describe, expect, test } from "bun:test";
import { LOCALES, aggregateLocales, getLocale } from "../../src/locales/index.js";

const EXISTING = ["en", "fr", "de", "es", "it", "nl", "pl", "pt"];

// Copied from HEAD:src/scanner/consent-modal.ts before the refactor.
const OLD_PRIVACY_URL = [
  "privacy[_-]?polic",
  "politique[_-]?(de[_-])?confidentialit",
  "politique[_-]?(de[_-])?vie[_-]?priv",
  "confidentialit",
  "vie[_-]?priv",
  "mentions[_-]?l.gales",
  "datenschutz",
  "privacidad",
  "data[_-]?protection",
  "data[_-]?privacy",
  "/privacy/([a-z]{2}-)?polic", // added in Task 5 (the only intended change to the old list)
];

const OLD_PRIVACY_TEXT = [
  "privacy\\s+polic",
  "politique\\s+(de\\s+)?confidentialit",
  "politique\\s+(de\\s+)?vie\\s+priv",
  "confidentialit",
  "vie\\s+priv",
  "mentions?\\s+l.gales?",
  "datenschutz",
  "privacidad",
  "data\\s+protection",
];

const OLD_BUTTONS: Record<"accept" | "reject" | "preferences", RegExp[]> = {
  accept: [
    /\b(accept|accept all|allow all|enable all|agree|ok|i accept|i agree|i consent|allow cookies)\b/i,
    /\b(accepter|acceptez|tout accepter|autoriser|tout autoriser|autoriser tout|j'accepte|d'accord|valider|confirmer)\b/i,
    /\b(akzeptieren|alle akzeptieren|zustimmen|einverstanden|annehmen|alle annehmen|ich stimme zu)\b/i,
    /\b(aceptar|aceptar todo|acepto|estoy de acuerdo|permitir todo)\b/i,
    /\b(accetta|accetta tutto|accetto|acconsento|acconsento a tutto|consenti tutto)\b/i,
    /\b(accepteren|alles accepteren|akkoord|ik ga akkoord|alles toestaan)\b/i,
    /zaakceptuj( wszystkie)?|(?<!nie\s)zgadzam si[eę]|akceptuj[eę]/i,
    /\b(aceitar|aceitar tudo|aceito|concordo)\b/i,
  ],
  reject: [
    /\b(refuse|reject|reject all|deny|decline|decline all|no thanks|skip|opt[- ]out|continue without|necessary only|essential only|only necessary|only essential)\b/i,
    /\b(refus|refuser|tout refuser|rejeter|tout rejeter|non merci|continuer sans accepter|n[eé]cessaires? uniquement|essentiels? uniquement|que les n[eé]cessaires?)\b/i,
    /\b(ablehnen|alle ablehnen|abweisen|nicht zustimmen|nein danke|nur notwendige)\b/i,
    /\b(rechazar|rechazar todo|denegar|no gracias|continuar sin aceptar|solo necesarias?)\b/i,
    /\b(rifiuta|rifiuta tutto|nega|no grazie|solo necessari)\b/i,
    /\b(weigeren|alles weigeren|afwijzen|nee bedankt|alleen noodzakelijke)\b/i,
    /odrzuć( wszystkie)?|nie zgadzam si[eę]|odm[oó]w/i,
    /\b(rejeitar|rejeitar tudo|recusar|n[aã]o obrigado)\b/i,
  ],
  preferences: [
    /\b(manage|customize|customise|settings|options|choose|configure|save preferences|save settings|save my choices)\b/i,
    /\b(param[eè]tres|pr[eé]f[eé]rences|personnaliser|g[eé]rer|choisir|enregistrer|sauvegarder)\b/i,
    /\b(einstellungen|anpassen|verwalten|konfigurieren|ausw[äa]hlen|mehr optionen)\b/i,
    /\b(ajustes|configurar|gestionar|opciones|personalizar|preferencias)\b/i,
    /\b(impostazioni|personalizza|gestisci|opzioni|configura|preferenze)\b/i,
    /\b(instellingen|aanpassen|beheren|instellen|voorkeuren)\b/i,
    /ustawienia|dostosuj|zarz[aą]dzaj|opcje|skonfiguruj|preferencje/i,
    /\b(configura[çc][oõ]es|personalizar|gerir|op[çc][oõ]es|defini[çc][oõ]es|prefer[eê]ncias)\b/i,
  ],
};

// Copied from HEAD:src/analyzers/wording.ts before the refactor.
const OLD_INDIRECT: RegExp[] = [
  /\bcontinue\s+without\b/i,
  /\bproceed\s+without\b/i,
  /\bwithout\s+(accepting|accept|consent|consenting)\b/i,
  /\bcontinuer\s+sans\b/i,
  /\bsans\s+(accepter|consentir|cookies)\b/i,
  /\bcontinuar\s+sin\b/i,
  /\bsin\s+(aceptar|consentir)\b/i,
  /\bcontinua\s+senza\b/i,
  /\bsenza\s+(accettare|consenso)\b/i,
  /\bweiter\s+ohne\b/i,
  /\bohne\s+(akzeptieren|zustimmen)\b/i,
  /\bvervolgenen?\s+zonder\b/i,
  /\bzonder\s+(accepteren|toestemming)\b/i,
];

const OLD_INFO = {
  purposes: ["finalit[eé]", "purpose", "objectif", "utilisation"],
  "third-parties": ["partenaire", "tiers", "third.part", "sous.traitant", "vendor"],
  withdrawal: ["retrait", "retirer", "withdraw", "revok", "modif", "changer", "chang"],
} as const;

const withFlags = (rs: RegExp[]) => rs.map((r) => `${r.source}/${r.flags}`);
const asSet = (xs: string[]) => [...new Set(xs)].sort();

describe("locale modules (existing languages)", () => {
  const agg = aggregateLocales(EXISTING);

  test("privacy URL stems match the old literals", () => {
    expect(asSet(agg.privacyUrl)).toEqual(asSet(OLD_PRIVACY_URL));
  });

  test("privacy text stems match the old literals", () => {
    expect(asSet(agg.privacyText)).toEqual(asSet(OLD_PRIVACY_TEXT));
  });

  for (const key of ["purposes", "third-parties", "withdrawal"] as const) {
    test(`info alternatives for ${key} match the old pattern`, () => {
      // Bun escapes non-ASCII in the `source` of regex literals as \uXXXX sequences; decode them back.
      const norm = (s: string) =>
        s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
      const alternatives = agg.info[key]
        .map((r) => r.source)
        .join("|")
        .split("|")
        .map(norm);
      const expected = OLD_INFO[key].map(norm);
      expect(asSet(alternatives)).toEqual(asSet(expected));
    });
    test(`info regexes for ${key} keep the i flag`, () => {
      for (const r of agg.info[key]) expect(r.flags).toBe("i");
    });
  }

  for (const kind of ["accept", "reject", "preferences"] as const) {
    test(`${kind} button patterns match the old literals including flags`, () => {
      expect(asSet(withFlags(agg[kind]))).toEqual(asSet(withFlags(OLD_BUTTONS[kind])));
    });
  }

  test("indirect-reject patterns match the old literals including flags", () => {
    expect(asSet(withFlags(agg.indirectReject))).toEqual(asSet(withFlags(OLD_INDIRECT)));
  });

  test("LOCALES codes are unique and resolvable", () => {
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(getLocale(code)?.code).toBe(code);
    expect(getLocale("xx")).toBeUndefined();
  });
});
