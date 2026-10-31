import type { InfoKey, LocaleData } from "./types.js";
import { en } from "./en.js";
import { fr } from "./fr.js";
import { de } from "./de.js";
import { es } from "./es.js";
import { it } from "./it.js";
import { nl } from "./nl.js";
import { pl } from "./pl.js";
import { pt } from "./pt.js";
import { fi } from "./fi.js";
import { sv } from "./sv.js";
import { no } from "./no.js";
import { da } from "./da.js";

export type { InfoKey, LocaleData } from "./types.js";

export const LOCALES: readonly LocaleData[] = [en, fr, de, es, it, nl, pl, pt, fi, sv, no, da];

export function getLocale(code: string): LocaleData | undefined {
  return LOCALES.find((l) => l.code === code);
}

export interface AggregatedLocales {
  accept: RegExp[];
  reject: RegExp[];
  preferences: RegExp[];
  combinedPreferences: RegExp[];
  indirectReject: RegExp[];
  privacyUrl: string[];
  privacyText: string[];
  info: Record<InfoKey, RegExp[]>;
}

/** Concatenate the vocabulary of the given locales (all when omitted), in LOCALES order. */
export function aggregateLocales(codes?: readonly string[]): AggregatedLocales {
  const selected = codes ? LOCALES.filter((l) => codes.includes(l.code)) : LOCALES;
  return {
    accept: selected.map((l) => l.buttons.accept),
    reject: selected.map((l) => l.buttons.reject),
    preferences: selected.map((l) => l.buttons.preferences),
    combinedPreferences: selected.flatMap((l) =>
      l.buttons.combinedPreferences ? [l.buttons.combinedPreferences] : [],
    ),
    indirectReject: selected.flatMap((l) => l.indirectReject),
    privacyUrl: selected.flatMap((l) => l.privacy.urlStems),
    privacyText: selected.flatMap((l) => l.privacy.textStems),
    info: {
      purposes: selected.flatMap((l) => l.info.purposes),
      "third-parties": selected.flatMap((l) => l.info["third-parties"]),
      withdrawal: selected.flatMap((l) => l.info.withdrawal),
    },
  };
}
