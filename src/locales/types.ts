export type InfoKey = "purposes" | "third-parties" | "withdrawal";

export interface LocaleData {
  code: string;
  buttons: { accept: RegExp; reject: RegExp; preferences: RegExp; combinedPreferences?: RegExp };
  indirectReject: RegExp[];
  privacy: { urlStems: string[]; textStems: string[] };
  info: Record<InfoKey, RegExp[]>;
}
