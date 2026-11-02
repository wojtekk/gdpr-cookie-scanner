import { describe, expect, test } from "bun:test";
import { selectPrivacyPolicyUrl, type LinkCandidate } from "../../src/scanner/privacy-link.js";
import { aggregateLocales } from "../../src/locales/index.js";

const agg = aggregateLocales();
const EXPLICIT_URL = ["tietosuoja", "privacy", "integritet"];
const EXPLICIT_TEXT = ["tietosuoja", "privacy", "integritet"];

function pick(
  links: Array<Partial<LinkCandidate> & { href: string }>,
  urlPats: string[] = agg.privacyUrl,
  textPats: string[] = agg.privacyText,
): string | null {
  return selectPrivacyPolicyUrl(
    links.map((l) => ({ text: "", inShadow: false, ...l })),
    urlPats,
    textPats,
  );
}

describe("selectPrivacyPolicyUrl", () => {
  test("narrow /privacy/ stem returns a policy URL but not settings", () => {
    expect(pick([{ href: "https://vend.com/privacy/fi-policy" }])).toBe(
      "https://vend.com/privacy/fi-policy",
    );
    expect(pick([{ href: "https://vend.com/privacy/settings" }])).toBeNull();
  });

  describe("Nordic settings links are dropped", () => {
    test("Tietosuoja-asetukset text on a privacysettings host", () => {
      expect(
        pick(
          [{ href: "https://privacysettings.vend.fi/privacy", text: "Tietosuoja-asetukset" }],
          EXPLICIT_URL,
          EXPLICIT_TEXT,
        ),
      ).toBeNull();
    });

    test("percent-encoded URL path", () => {
      expect(
        pick(
          [{ href: "https://example.se/integritetsinst%C3%A4llningar" }],
          EXPLICIT_URL,
          EXPLICIT_TEXT,
        ),
      ).toBeNull();
    });

    test("NFD text", () => {
      expect(
        pick(
          [{ href: "https://example.se/x", text: "Integritetsinställningar".normalize("NFD") }],
          EXPLICIT_URL,
          EXPLICIT_TEXT,
        ),
      ).toBeNull();
    });

    test("mixed list returns the policy link", () => {
      expect(
        pick(
          [
            { href: "https://example.se/a", text: "Integritetsinställningar" },
            { href: "https://example.se/policy", text: "Integritetspolicy" },
          ],
          EXPLICIT_URL,
          EXPLICIT_TEXT,
        ),
      ).toBe("https://example.se/policy");
    });

    test("Tori Mainosasetukset", () => {
      expect(
        pick(
          [{ href: "https://tori.fi/privacy", text: "Mainosasetukset" }],
          EXPLICIT_URL,
          EXPLICIT_TEXT,
        ),
      ).toBeNull();
    });

    test("settings host name drops the link", () => {
      expect(
        pick(
          [{ href: "https://privacysettings.vend.fi/", text: "Tietosuoja" }],
          EXPLICIT_URL,
          EXPLICIT_TEXT,
        ),
      ).toBeNull();
    });
  });

  describe("English stays as today", () => {
    test("policy and cookie settings text is returned", () => {
      expect(pick([{ href: "/privacy", text: "Privacy Policy & Cookie Settings" }])).toBe(
        "/privacy",
      );
    });

    test("settings in the path is returned", () => {
      const href = "https://example.com/account/settings/privacy-policy";
      expect(pick([{ href, text: "Privacy Policy" }])).toBe(href);
    });
  });

  describe("light DOM wins over shadow DOM", () => {
    test("shadow listed before light returns the light link", () => {
      expect(
        pick([
          { href: "https://example.com/shadow", text: "Privacy Policy", inShadow: true },
          { href: "https://example.com/light", text: "Privacy Policy" },
        ]),
      ).toBe("https://example.com/light");
    });

    test("only a shadow candidate is returned", () => {
      expect(
        pick([{ href: "https://example.com/shadow", text: "Privacy Policy", inShadow: true }]),
      ).toBe("https://example.com/shadow");
    });
  });

  test("javascript: is skipped", () => {
    expect(pick([{ href: "javascript:void(0)", text: "Privacy Policy" }])).toBeNull();
  });

  test("NFD text-only match (Mentions légales)", () => {
    expect(pick([{ href: "/legal/1", text: "Mentions légales".normalize("NFD") }])).toBe(
      "/legal/1",
    );
  });

  describe("Finnish policy links", () => {
    test.each([
      "Tietosuojakäytäntö",
      "Tietosuojakäytännön",
      "TIETOSUOJAKÄYTÄNTÖ",
      "Tietosuoja- ja evästekäytäntö",
      "Tietosuojaseloste",
      "Rekisteriseloste",
    ])("text '%s' matches", (text) => {
      expect(pick([{ href: "/x/1", text }])).toBe("/x/1");
    });

    test.each([
      "https://example.fi/tietosuojakaytanto",
      "https://example.fi/tietosuojak%C3%A4yt%C3%A4nt%C3%B6",
    ])("URL %s matches", (href) => {
      expect(pick([{ href }])).toBe(href);
    });

    test.each(["Tietosuojavastaava", "Poista tietoni"])("text '%s' does not match", (text) => {
      expect(pick([{ href: "/x/1", text }])).toBeNull();
    });
  });

  describe("Swedish policy links", () => {
    test.each(["Personuppgifts- och cookiepolicy", "Integritetspolicy", "Personuppgiftspolicy"])(
      "text '%s' matches",
      (text) => {
        expect(pick([{ href: "/x/1", text }])).toBe("/x/1");
      },
    );

    test("URL matches", () => {
      const href = "https://example.se/integritetspolicy";
      expect(pick([{ href }])).toBe(href);
    });

    test.each(["Integritetsinställningar", "Radera personuppgifter"])(
      "text '%s' does not match",
      (text) => {
        expect(pick([{ href: "/x/1", text }])).toBeNull();
      },
    );

    test("percent-encoded settings URL does not match", () => {
      expect(pick([{ href: "https://example.se/integritetsinst%C3%A4llningar" }])).toBeNull();
    });
  });

  describe("Norwegian policy links", () => {
    test.each([
      "Personvernerklæring",
      "Personvern- og cookieerklæring",
      "Personvernpolicy",
      "Personopplysninger-policy",
    ])("text '%s' matches", (text) => {
      expect(pick([{ href: "/x/1", text }])).toBe("/x/1");
    });

    test.each([
      "https://example.no/personvernerklaering",
      "https://example.no/personvernerkl%C3%A6ring",
    ])("URL %s matches", (href) => {
      expect(pick([{ href }])).toBe(href);
    });

    test.each(["Personverninnstillinger", "Personvernombud"])(
      "text '%s' does not match",
      (text) => {
        expect(pick([{ href: "/x/1", text }])).toBeNull();
      },
    );
  });

  describe("Danish policy links", () => {
    test.each([
      "Privatlivspolitik",
      "Persondatapolitik",
      "Cookiepolitik",
      "hvordan Vend behandler dine personoplysninger",
    ])("text '%s' matches", (text) => {
      expect(pick([{ href: "/x/1", text }])).toBe("/x/1");
    });

    test("URL matches", () => {
      const href = "https://example.dk/privatlivspolitik";
      expect(pick([{ href }])).toBe(href);
    });

    test.each([
      "Privatlivsindstillinger",
      "Slet persondata",
      "Anmod om indsigt i personoplysninger",
    ])("text '%s' does not match", (text) => {
      expect(pick([{ href: "/x/1", text }])).toBeNull();
    });
  });

  test("every privacy URL stem is ASCII", () => {
    for (const p of aggregateLocales().privacyUrl) expect(p).toMatch(/^[\x00-\x7f]*$/);
  });

  test("skips a candidate whose href is not a string", () => {
    const bad = { href: {}, text: "Privacy Policy", inShadow: false } as unknown as LinkCandidate;
    const good: LinkCandidate = {
      href: "https://example.com/privacy-policy",
      text: "Privacy Policy",
      inShadow: false,
    };
    expect(selectPrivacyPolicyUrl([bad, good], agg.privacyUrl, agg.privacyText)).toBe(good.href);
  });
});

describe("link text variants (text-only match, href has no stem)", () => {
  const HREF = "https://example.com/p/42";
  const base = {
    sv: "Personuppgifts- och cookiepolicy",
    fi: "Tietosuoja- ja evästekäytäntö",
    no: "Personvern- og cookieerklæring",
    da: "hvordan Vend behandler dine personoplysninger",
  };
  const variants = (t: string): Array<[string, string]> => [
    ["exact", t],
    ["double spaces", t.replace(/ /g, "  ")],
    ["nbsp", t.replace(/ /g, " ")],
    ["leading/trailing whitespace", `  ${t}\n `],
    ["newline inside", t.replace(" ", "\n   ")],
    ["no space after hyphen", t.replace("- ", "-")],
    ["space before hyphen", t.replace("-", " -")],
    ["en dash", t.replace("-", "–")],
    ["soft hyphen", t.replace("-", "­")],
    ["UPPERCASE", t.toUpperCase()],
    ["trailing period", `${t}.`],
    ["NFD", t.normalize("NFD")],
    ["zero-width space", t.replace(" ", "​ ")],
  ];
  const found = (text: string) => pick([{ href: HREF, text }]);
  // Danish has no hyphen in its text, so the hyphen variants do not apply.
  const hyphenOnly = new Set([
    "no space after hyphen",
    "space before hyphen",
    "en dash",
    "soft hyphen",
  ]);

  for (const lang of ["sv", "fi", "no"] as const) {
    describe(lang, () => {
      test.each(variants(base[lang]))("%s is found", (_label, text) => {
        expect(found(text)).toBe(HREF);
      });
    });
  }

  describe("da", () => {
    test.each(variants(base.da).filter(([label]) => !hyphenOnly.has(label)))(
      "%s is found",
      (_label, text) => {
        expect(found(text)).toBe(HREF);
      },
    );
  });

  test.each([
    "Personverninnstillinger",
    "Personvernombud",
    "Personvern",
    "Personuppgifts- och cookieinställningar",
    "Tietosuoja- ja evästeasetukset",
  ])("'%s' is not a policy link", (text) => {
    expect(found(text)).toBeNull();
  });
});
