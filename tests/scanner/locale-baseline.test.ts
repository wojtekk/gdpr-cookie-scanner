import { describe, it, expect } from "bun:test";
import { classifyButtonText } from "../../src/scanner/consent-modal.js";
import { analyzeButtonWording, analyzeModalText } from "../../src/analyzers/wording.js";
import type { ConsentButton } from "../../src/types.js";
import { BUTTON_CORPUS, INFO_CORPUS, INDIRECT_CORPUS } from "./locale-corpus.js";
import golden from "./locale-baseline.golden.json";

// Characterization baseline: pins what the classifiers returned before the Nordic locale work,
// so refactors of the locale tables provably change nothing for existing locales.

function makeRejectButton(text: string): ConsentButton {
  return {
    type: "reject",
    text,
    selector: "button",
    isVisible: true,
    boundingBox: { x: 0, y: 0, width: 120, height: 40 },
    fontSize: 14,
    backgroundColor: "rgb(0,0,0)",
    textColor: "rgb(255,255,255)",
    contrastRatio: 21,
    clickDepth: 1,
  };
}

describe("locale baseline", () => {
  it("golden covers exactly the corpora", () => {
    expect(Object.keys(golden.buttons).sort()).toEqual([...BUTTON_CORPUS].sort());
    expect(Object.keys(golden.info).sort()).toEqual([...INFO_CORPUS].sort());
    expect(Object.keys(golden.indirect).sort()).toEqual([...INDIRECT_CORPUS].sort());
  });

  describe("classifyButtonText(label, null)", () => {
    it.each(BUTTON_CORPUS.map((label) => [label]))("%j", (label) => {
      const expected = (golden.buttons as Record<string, string>)[label];
      expect(expected).toBeDefined();
      expect(classifyButtonText(label, null)).toBe(expected);
    });
  });

  describe("analyzeModalText(text).missingInfo", () => {
    it.each(INFO_CORPUS.map((text) => [text]))("%j", (text) => {
      const expected = (golden.info as Record<string, string[]>)[text];
      expect(expected).toBeDefined();
      expect(analyzeModalText(text).missingInfo).toEqual(expected);
    });
  });

  describe("analyzeButtonWording(reject).hasIndirectRejectLabel", () => {
    it.each(INDIRECT_CORPUS.map((label) => [label]))("%j", (label) => {
      const expected = (golden.indirect as Record<string, boolean>)[label];
      expect(typeof expected).toBe("boolean");
      expect(analyzeButtonWording([makeRejectButton(label)]).hasIndirectRejectLabel).toBe(expected);
    });
  });
});
