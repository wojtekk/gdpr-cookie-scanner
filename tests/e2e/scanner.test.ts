import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { ScanResult } from "../../src/types.js";
import { Scanner } from "../../src/scanner/index.js";
import { startTestServer, type TestServer } from "../helpers/test-server.js";

describe("Scanner E2E", () => {
  let server: TestServer;
  let outputDir: string;

  beforeAll(async () => {
    server = await startTestServer();
    outputDir = await mkdtemp(join(tmpdir(), "gdpr-test-"));
  });

  afterAll(async () => {
    await server.close();
    await rm(outputDir, { recursive: true, force: true });
  });

  function makeOptions(fixture: string, locale = "en-US") {
    return {
      url: `${server.url}/${fixture}`,
      outputDir: join(outputDir, fixture.replace(".html", "")),
      timeout: 30_000,
      screenshots: false,
      locale,
      verbose: false,
    };
  }

  describe("compliant-site.html", () => {
    let result: ScanResult;

    beforeAll(async () => {
      result = await new Scanner(makeOptions("compliant-site.html")).run();
    });

    it("detects the consent modal", () => {
      expect(result.modal.detected).toBe(true);
    });

    it("finds both accept and reject buttons", () => {
      const types = result.modal.buttons.map((b) => b.type);
      expect(types).toContain("accept");
      expect(types).toContain("reject");
    });

    it("finds the privacy policy link in the modal", () => {
      expect(result.modal.privacyPolicyUrl).toBeTruthy();
    });

    it("finds a privacy policy link on the page", () => {
      expect(result.privacyPolicyUrl).toBeTruthy();
    });

    it("assigns a passing compliance grade (A or B)", () => {
      expect(["A", "B"]).toContain(result.compliance.grade);
    });

    it("does not flag pre-consent cookies", () => {
      const illegalPreConsent = result.cookiesBeforeInteraction.filter((c) => c.requiresConsent);
      expect(illegalPreConsent).toHaveLength(0);
    });
  });

  describe("non-compliant-site.html", () => {
    let result: ScanResult;

    beforeAll(async () => {
      result = await new Scanner(makeOptions("non-compliant-site.html")).run();
    });

    it("detects the consent modal", () => {
      expect(result.modal.detected).toBe(true);
    });

    it("detects _ga cookie set before any interaction", () => {
      const gaBeforeInteraction = result.cookiesBeforeInteraction.some(
        (c) => c.name === "_ga" && c.requiresConsent,
      );
      expect(gaBeforeInteraction).toBe(true);
    });

    it("raises an auto-consent issue for pre-interaction cookies", () => {
      const issue = result.compliance.issues.find((i) => i.type === "auto-consent");
      expect(issue).toBeDefined();
    });

    it("assigns a failing grade (C, D, or F)", () => {
      expect(["C", "D", "F"]).toContain(result.compliance.grade);
    });
  });

  describe("no-modal-site.html", () => {
    let result: ScanResult;

    beforeAll(async () => {
      result = await new Scanner(makeOptions("no-modal-site.html")).run();
    });

    it("reports modal as not detected", () => {
      expect(result.modal.detected).toBe(false);
    });

    it("still finds the page-level privacy policy link", () => {
      expect(result.privacyPolicyUrl).toBeTruthy();
    });

    it("assigns grade A — no consent mechanism needed for a tracking-free site", () => {
      expect(result.compliance.grade).toBe("A");
    });

    it("raises no compliance issues for a tracking-free site without a modal", () => {
      expect(result.compliance.issues).toHaveLength(0);
    });
  });

  const NORDIC = [
    {
      fixture: "compliant-site-fi.html",
      locale: "fi-FI",
      accept: "Hyväksy kaikki",
      reject: "Hylkää kaikki",
      modalHref: "/legal/fi-modal",
      pageHref: "/legal/fi-footer",
    },
    {
      fixture: "compliant-site-sv.html",
      locale: "sv-SE",
      // The fixture spells the accept label in NFD (a + combining diaeresis).
      accept: "Godkänn alla",
      reject: "Avvisa alla",
      modalHref: "/legal/sv-modal",
      pageHref: "/legal/sv-footer",
    },
    {
      fixture: "compliant-site-no.html",
      locale: "nb-NO",
      accept: "Godta alle",
      reject: "Avvis alle",
      modalHref: "/legal/no-modal",
      pageHref: "/legal/no-footer",
    },
    {
      fixture: "compliant-site-da.html",
      locale: "da-DK",
      accept: "Tillad alle",
      reject: "Afvis alle",
      modalHref: "/legal/da-modal",
      pageHref: "/legal/da-footer",
    },
  ];

  for (const nordic of NORDIC) {
    describe(`${nordic.fixture} (${nordic.locale})`, () => {
      let result: ScanResult;

      beforeAll(async () => {
        result = await new Scanner(makeOptions(nordic.fixture, nordic.locale)).run();
      });

      const typeOf = (text: string) =>
        result.modal.buttons.find((b) => b.text === text.normalize("NFC"))?.type;

      it("completes without errors and detects the consent modal", () => {
        expect(result.errors).toEqual([]);
        expect(result.modal.detected).toBe(true);
      });

      it("classifies the accept and reject buttons by their text", () => {
        expect(typeOf(nordic.accept)).toBe("accept");
        expect(typeOf(nordic.reject)).toBe("reject");
      });

      it("finds the exact modal and page-level privacy policy links", () => {
        expect(result.modal.privacyPolicyUrl).toBe(`${server.url}${nordic.modalHref}`);
        expect(result.privacyPolicyUrl).toBe(`${server.url}${nordic.pageHref}`);
      });

      it("raises no critical issue and no missing-information issue", () => {
        const issues = result.compliance.issues;
        expect(issues.filter((i) => i.severity === "critical")).toEqual([]);
        for (const word of ["purposes", "third-parties", "withdrawal"]) {
          expect(issues.filter((i) => i.description.includes(word))).toEqual([]);
        }
      });
    });
  }

  describe("compliant-site-sv.html NFC normalisation", () => {
    it("extracts the decomposed accept label as NFC", async () => {
      const result = await new Scanner(makeOptions("compliant-site-sv.html", "sv-SE")).run();
      const accept = result.modal.buttons.find((b) => b.type === "accept");
      expect(accept?.text).toBe("Godk\u00e4nn alla");
      expect(accept?.text).toBe(accept?.text.normalize("NFC"));
    });
  });

  describe("compliant-site-no.html second-layer button", () => {
    let result: ScanResult;

    beforeAll(async () => {
      result = await new Scanner(makeOptions("compliant-site-no.html", "nb-NO")).run();
    });

    it("types 'Tilpass eller avvis' as preferences and only 'Avvis alle' as reject", () => {
      expect(result.modal.buttons.find((b) => b.text === "Tilpass eller avvis")?.type).toBe(
        "preferences",
      );
      const rejects = result.modal.buttons.filter((b) => b.type === "reject");
      expect(rejects.map((b) => b.text)).toEqual(["Avvis alle"]);
    });

    it("raises no no-reject-button issue", () => {
      expect(result.compliance.issues.find((i) => i.type === "no-reject-button")).toBeUndefined();
    });

    it("leaves no consent-requiring cookie after reject", () => {
      expect(result.cookiesAfterReject.filter((c) => c.requiresConsent)).toEqual([]);
    });
  });
});
