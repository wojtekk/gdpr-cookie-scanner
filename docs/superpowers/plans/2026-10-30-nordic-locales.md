# Nordic Locales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the scanner Finnish, Swedish, Norwegian and Danish consent vocabulary (buttons, privacy-policy links, purposes / third parties / withdrawal), with one module per locale.

**Architecture:** Per-language vocabulary moves from constants in `src/scanner/consent-modal.ts` and `src/analyzers/wording.ts` into `src/locales/<code>.ts` modules, aggregated by `src/locales/index.ts`. The privacy-link search becomes a browser-side link collector (light DOM plus open shadow roots) and a pure Node-side selector. A golden baseline written before the refactor proves existing locales do not change.

**Tech Stack:** TypeScript, Bun (`bun test`), Playwright, oxlint / oxfmt, Changesets.

**Spec:** `docs/superpowers/specs/2026-10-30-nordic-locales-design.md`

## Environment notes (this worktree)

- Browser-driven tests need Chromium and must run outside the Bash sandbox. Prefix them with
  `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/claude/pw-browsers` (installed there already; reinstall with
  `bunx playwright install chromium-headless-shell` if missing). The full form is
  `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/claude/pw-browsers bun test --timeout 120000 <files>`; `E2E` below means this prefix.
- `UNIT` below means `bun test tests/analyzers tests/classifiers tests/scanner tests/unit` (no browser). `bun run test`
  also runs the browser e2e group, so it is used only in Task 11 (with the `PLAYWRIGHT_BROWSERS_PATH` prefix, outside the sandbox).
- Test runner is `bun test` (the repo's CLAUDE.md says vitest/pnpm; `package.json` is authoritative).
  New tests go under `tests/analyzers`, `tests/scanner` or `tests/unit` (run by `bun run test`) or `tests/e2e`
  (browser). Anything under another directory is not run in CI.
- Module system: local imports include the `.js` extension (`./en.js`, `../locales/index.js`, `./privacy-link.js`), tests too.
- `bun run typecheck` covers `src/` only (`tsconfig.json` includes `src/**/*`); test files are not type-checked, so write them carefully.
- Before every commit: `bun run lint`, `bun run format`, `bun run typecheck` (0 errors). Conventional Commits.
  End commit messages with the attribution trailer from the session reminder.

## Global Constraints

- Existing fr, de, es, it, nl, pl, pt results must not change (en/fr info keywords are split, not altered), except the two deliberate changes listed below.
- Deliberate changes to existing-locale behaviour: (1) NFC normalisation (Task 4); (2) the new en URL stem `/privacy/([a-z]{2}-)?polic` (Task 5). The settings exclusion is **not** one of them: it uses Nordic settings words only, plus English `settings` in the URL host name only, so English links such as text `Privacy Policy & Cookie Settings` or a policy at `/account/settings/privacy-policy` are still returned (user decision, option B).
- Anchoring in new Nordic patterns: `\b` only where the adjacent character is ASCII. Where a stem starts or ends with ä å æ ö ø use `(?<![\p{L}\p{M}])` / `(?![\p{L}\p{M}])` with the `u` flag. Do not copy the Polish no-anchor approach: with all locales tested at once it matches inside unrelated words (`neka` in German `Onlinekatalog`). Short stems (5 letters or fewer: `neka`, `nej`, `endre`, `salli`) keep both anchors; verb stems take no trailing anchor (`godkänn` must match `godkänner`); long distinctive stems may be unanchored so compounds match (`Cookieinnstillinger`, `Evästeasetukset`).
- Info stems feed one shared list (`REQUIRED_INFO_PATTERNS`, every language). A new stem must not make an existing-language text stop reporting a concept as missing: no bare `partner` / `partners`, no unanchored `endre` (matches fr `rendre`), no `muut` (Finnish "other"). Task 1's `INFO_CORPUS` holds collision probes that pin this.
- Privacy URL stems are ASCII only (`link.href` is percent-encoded; a test asserts every stem is ASCII). Link patterns stay `string`s: a spec constraint from when matching ran in the browser. After Task 5 matching is Node-side, so `RegExp` would also work; keep strings to avoid churn.
- Combined "manage or reject" labels classify as `preferences` (fi, sv, no, da only), in either word order; English "Manage or reject" stays `reject`.
- `REQUIRED_INFO_PATTERNS.duration` stays as is in `wording.ts`. No iframe work.
- NFC normalisation only changes decomposed input. "ASCII-folded" applies to URL stems only.
- Vocabulary beyond the spec's "observed" table is assumed and needs native-speaker review; say so in the changeset.

## Review Focus

1. A settings link ("Tietosuoja-asetukset", `privacysettings.vend.fi`, percent-encoded `integritetsinst%C3%A4llningar`) returned as the policy → Task 5.
2. Closed shadow roots must not throw; `javascript:` links inside open shadow roots stay skipped → Task 5.
3. Layer headings ("Nødvendige cookies", "Nödvändiga cookies", "Välttämättömät evästeet", "Tilpas tjenester") misclassified as reject → Tasks 6–9.
4. Uppercase or decomposed Nordic labels (`HYLKÄÄ KAIKKI`, NFD `ä`) not matching → Tasks 6–9.
5. Inflected or compound link text ("Tietosuojakäytännön", "Personuppgiftspolicy") not matching → Tasks 6, 7.
6. Existing-language text flipping from "missing" to "present" through a Nordic info stem (`partners`, `rendre`) → Tasks 1, 6–9.
7. Compound labels (`Cookieinnstillinger`, `Evästeasetukset`) and inflected verbs (`godkänner`, `kolmansille osapuolille`) not matching → Tasks 6–9.

---

### Task 1: Characterization baseline (tests only, passes on current code)

**Files:**
- Create: `tests/scanner/locale-corpus.ts`, `tests/scanner/locale-baseline.test.ts`, `tests/scanner/locale-baseline.golden.json`, `tests/e2e/privacy-link-baseline.test.ts`
- Also commit: the spec and this plan under `docs/superpowers/`.

**Interfaces:**
- Produces: `BUTTON_CORPUS`, `INFO_CORPUS`, `INDIRECT_CORPUS` (all `readonly string[]`) from `locale-corpus.ts`; golden shape `{ _generatedFrom: string, buttons: Record<string, ConsentButtonType>, info: Record<string, string[]>, indirect: Record<string, boolean> }`.

- [ ] **Step 1: Commit the docs.** `git add docs/superpowers`, then `git commit -m "docs: Nordic locale design and plan"`.
- [ ] **Step 2: Write `locale-corpus.ts`.**
  - `BUTTON_CORPUS` = every string literal passed to `classifyButtonText` in `tests/scanner/button-classification.test.ts`, plus `"Manage or reject"`, `"Continue without accepting"`, `"Nécessaires uniquement"`.
  - `INFO_CORPUS` = the `analyzeModalText` texts in **both** `tests/analyzers/wording.test.ts` and `tests/unit/wording.test.ts` (near-duplicates), plus one sentence per existing locale per concept, plus **collision probes** that report the concept as missing today and must keep doing so: en `We share data with our partners and you can open the settings`, de `Wir und unsere Partner verwenden Cookies`, nl `Wij en onze partners gebruiken cookies`, fr `Vous pouvez nous rendre visite et prendre connaissance de nos conditions`, and for en, fr and de a realistic paragraph that uses common banner words but none of purposes / third-parties / withdrawal (for example `Other cookies are necessary for the site to work.`).
  - `INDIRECT_CORPUS` = one invented phrase per old `INDIRECT_REJECT_LABELS` regex (13 regexes, each phrase matching exactly one of them) plus negatives `Reject all`, `Continue`, `Weiter`.
  - No Nordic strings (they would change after Task 6).
- [ ] **Step 3: Generate the golden.** Write a throwaway script outside the repo (for example `/private/tmp/claude/gen-golden.ts`) importing `classifyButtonText`, `analyzeModalText`, `analyzeButtonWording` from the worktree `src/` and the corpus. It writes the golden with `_generatedFrom` = the base commit SHA (`git rev-parse HEAD` before any `src/` change): `classifyButtonText(label, null)`, `analyzeModalText(text).missingInfo`, and `analyzeButtonWording([button of type "reject" with that text]).hasIndirectRejectLabel`. Run it on the unmodified code. Do not commit the script.
- [ ] **Step 4: Write `locale-baseline.test.ts`.** Three `it.each` blocks, one per golden section; each asserts the live result equals the golden entry (ignore `_generatedFrom`).
- [ ] **Step 5: Write `tests/e2e/privacy-link-baseline.test.ts`.** Launch `chromium`; **one `page.setContent` per case**, each with a non-matching decoy `<a>` before the case's link (a single page with all links only ever returns the first match). Cases:
  - Positives (text → match): `Privacy Policy`, `Politique de confidentialité`, `Politique de vie privée`, `Mentions légales`, `Datenschutzerklärung`, `Política de privacidad`, `Data protection`; URL-only matches `/privacy-policy`, `/datenschutz`, `/data-privacy`.
  - Negatives: `Terms of service` → `null`; a `javascript:void(0)` link with text `Privacy Policy` placed before a valid `Privacy Policy` link → the valid href (so a crash cannot pass as "no match").
  - Pins of today's behaviour (record what the unmodified code returns, assert it): `<a href="#">Privacy Policy</a>`; `Privacy Policy` with href `/account/settings/privacy-policy` (returned today and after Task 5); text `Privacy Policy & Cookie Settings` with a neutral href (returned today and after Task 5); text `Paramètres de confidentialité` placed before `Politique de confidentialité` (today returns the settings link: a pre-existing false positive, pinned, not fixed here); scope: with `scopeSelector` `#modal`, a policy link outside `#modal` is ignored, and a `scopeSelector` that matches nothing falls back to the whole document.
- [ ] **Step 6: Run.** `bun test tests/scanner/locale-baseline.test.ts` and `E2E tests/e2e/privacy-link-baseline.test.ts`. Expected: PASS on unmodified code.
- [ ] **Step 7: Commit.** `test: add locale characterization baseline`.

### Task 2: Locale modules for the eight existing languages (not yet wired)

**Files:**
- Create: `src/locales/types.ts`, `src/locales/{en,fr,de,es,it,nl,pl,pt}.ts`, `src/locales/index.ts`
- Test: `tests/scanner/locales.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type InfoKey = "purposes" | "third-parties" | "withdrawal";
  export interface LocaleData {
    code: string;
    buttons: { accept: RegExp; reject: RegExp; preferences: RegExp; combinedPreferences?: RegExp };
    indirectReject: RegExp[];
    privacy: { urlStems: string[]; textStems: string[] };
    info: Record<InfoKey, RegExp[]>;
  }
  ```
- Produces (`index.ts`):
  ```ts
  export const LOCALES: readonly LocaleData[];
  export function getLocale(code: string): LocaleData | undefined;
  export interface AggregatedLocales {
    accept: RegExp[]; reject: RegExp[]; preferences: RegExp[]; combinedPreferences: RegExp[];
    indirectReject: RegExp[]; privacyUrl: string[]; privacyText: string[]; info: Record<InfoKey, RegExp[]>;
  }
  export function aggregateLocales(codes?: readonly string[]): AggregatedLocales; // all locales when omitted
  ```

- [ ] **Step 1: Write the failing test** in `tests/scanner/locales.test.ts`. With `EXISTING = ["en","fr","de","es","it","nl","pl","pt"]`:
  - `aggregateLocales(EXISTING).privacyUrl` as a set equals the ten old `PRIVACY_POLICY_URL_PATTERNS` literals and `.privacyText` equals the nine old text literals (copy both lists from `HEAD:src/scanner/consent-modal.ts` into the test).
  - For each `InfoKey`, the set of top-level `|` alternatives of `aggregateLocales(EXISTING).info[key].map(r => r.source).join("|")` equals the old alternatives: purposes `finalit[eé]`, `purpose`, `objectif`, `utilisation`; third-parties `partenaire`, `tiers`, `third.part`, `sous.traitant`, `vendor`; withdrawal `retrait`, `retirer`, `withdraw`, `revok`, `modif`, `changer`, `chang`.
  - **Buttons and indirect:** `aggregateLocales(EXISTING).{accept,reject,preferences}` and `.indirectReject`, each mapped to `source + "/" + flags`, equal as sets the 24 button literals and the 13 indirect-reject regexes copied from `HEAD` (a dropped `i` flag must fail).
  - `LOCALES` codes are unique, every code resolves with `getLocale`, and `getLocale("xx")` is `undefined`.
- [ ] **Step 2: Run to verify it fails** (`bun test tests/scanner/locales.test.ts`): module not found.
- [ ] **Step 3: Create the modules by moving, not rewriting.** Cut each button pattern (accept / reject / preferences) from `PATTERNS_BY_LOCALE` unchanged into its locale file, including the Polish no-anchor comment. Split the other lists by language following the existing comments: `INDIRECT_REJECT_LABELS` → en, fr, es, it, de, nl; privacy stems → en (`privacy[_-]?polic`, `data[_-]?protection`, `data[_-]?privacy`; text `privacy\\s+polic`, `data\\s+protection`), fr (politique / confidentialit / vie priv / mentions légales), de (`datenschutz`), es (`privacidad`). Info keywords: **en** gets `purpose`, `third.part`, `vendor`, `withdraw`, `revok`, `modif`, `chang`; **fr** gets `finalit[eé]`, `objectif`, `utilisation`, `partenaire`, `tiers`, `sous.traitant`, `retrait`, `retirer`, `changer`; each regex keeps the `i` flag. Other locales: empty arrays. `aggregateLocales` concatenates in `LOCALES` order. Pre-existing quirks are moved as they are, not fixed (Dutch `\bvervolgenen?\s+zonder\b` does not match `Vervolgen zonder`; English `\bok\b` matches the `Ok` in `Okänd`): list them in the final summary.
- [ ] **Step 4: Run to verify it passes**, plus `bun run typecheck`.
- [ ] **Step 5: Commit.** `refactor: add per-locale vocabulary modules for existing languages`.

### Task 3: Rewire consumers to the locale modules

**Files:**
- Modify: `src/scanner/consent-modal.ts` (remove `PATTERNS_BY_LOCALE`, `ButtonPatternSet`, `PRIVACY_POLICY_URL_PATTERNS`, `PRIVACY_POLICY_TEXT_PATTERNS`), `src/analyzers/wording.ts` (remove `INDIRECT_REJECT_LABELS`; rebuild `REQUIRED_INFO_PATTERNS`)

**Interfaces:**
- Consumes: `aggregateLocales()` from Task 2.
- Produces: no signature changes. `resolveButtonPatterns(_lang)` still returns `{accept, reject, preferences}` arrays; `analyzeModalText` and `analyzeButtonWording` unchanged. `REQUIRED_INFO_PATTERNS` keeps its order: purposes, third-parties, duration, withdrawal; `duration` stays the literal regex.

- [ ] **Step 1: Confirm the safety net is green first:** `UNIT`.
- [ ] **Step 2: Compute `aggregateLocales()` once at module load** in each consumer file and use it: button arrays in `resolveButtonPatterns`, `privacyUrl` / `privacyText` in `findPrivacyPolicyUrl`, `indirectReject` in `analyzeButtonWording`, `info[key]` in `REQUIRED_INFO_PATTERNS`.
- [ ] **Step 3: Run the full set:** `UNIT` and `E2E tests/e2e/privacy-link-baseline.test.ts`. Expected: all PASS, golden unchanged.
- [ ] **Step 4: Commit.** `refactor: read locale vocabulary from src/locales`.

### Task 4: NFC normalisation

**Files:**
- Modify: `normalizeText` in `src/scanner/consent-modal.ts`; `analyzeModalText` in `src/analyzers/wording.ts`
- Test: `tests/scanner/button-classification.test.ts`

- [ ] **Step 1: Failing test (buttons only).** `classifyButtonText("Nécessaires uniquement".normalize("NFD"), "fr")` is `"reject"` (it returns `"unknown"` today). Do **not** add an NFD info-text test here: `finalit[eé]` matches an NFD `Finalité` through its plain `e`, so such a test passes without NFC and proves nothing. The NFD info test is in Task 7 (`ändamål`), the NFD link-text test in Task 5.
- [ ] **Step 2: Run to verify it fails** (a decomposed accent does not match `[eé]`).
- [ ] **Step 3: Implement.** Call `.normalize("NFC")` first in `normalizeText` and on the input of `analyzeModalText`.
- [ ] **Step 4: Run** `UNIT`: PASS including the golden.
- [ ] **Step 5: Commit.** `fix: normalise consent text to NFC before matching`.

### Task 5: Shadow-DOM-aware privacy link search

**Files:**
- Create: `src/scanner/privacy-link.ts`
- Modify: `findPrivacyPolicyUrl` in `src/scanner/consent-modal.ts`; add the narrow `/privacy/` URL stem to `src/locales/en.ts`
- Test: `tests/scanner/privacy-link.test.ts` (pure), `tests/e2e/privacy-link.test.ts` (browser)

**Interfaces:**
- Produces (`privacy-link.ts`):
  ```ts
  export interface LinkCandidate { href: string; text: string; inShadow: boolean }
  export function selectPrivacyPolicyUrl(links: LinkCandidate[], urlPatterns: string[], textPatterns: string[]): string | null
  ```
  Rules: skip hrefs by the same rule the old code applies (move it unchanged; the baseline pins what `href="#"` does today) plus `javascript:`, `data:`, `vbscript:`; NFC-normalise and trim text; **drop any link whose NFC text, or whose URL host+path after `decodeURI` (in a try/catch, then NFC), matches the Nordic settings words** `/asetukset|inst[aä]llning|innstilling|indstilling/i`, **or whose URL host name matches `/settings/i`** (English `settings` in the text or path does not drop a link); among the rest, match by URL or text patterns (case-insensitive); light-DOM candidates win over shadow ones regardless of position in the list, document order within each; return the original `href`.
- `findPrivacyPolicyUrl(page, scopeSelector?)` keeps its signature and its existing scope behaviour (`document.querySelector(scope) ?? document`; pinned in Task 1, a shadow-hosted modal falling back to the whole page is a documented follow-up). In `page.evaluate` it collects `LinkCandidate[]` from the scope root (or `document`), then walks `root.shadowRoot` and every descendant's open `shadowRoot` recursively (closed roots have `shadowRoot === null`), marking `inShadow`. Matching is Node-side: call `selectPrivacyPolicyUrl` with the aggregated patterns after `evaluate` returns, never inside it. It keeps `.catch(() => null)`.
- The new `en` URL stem is `/privacy/([a-z]{2}-)?polic`.

- [ ] **Step 1: Failing pure tests** (`pick` = helper building one candidate list):
  - `https://vend.com/privacy/fi-policy` is returned; `https://vend.com/privacy/settings` is not.
  - Settings, with **explicit patterns that would otherwise match** (`["tietosuoja", "privacy", "integritet"]`): text `Tietosuoja-asetukset` with href `https://privacysettings.vend.fi/privacy` is not returned; `https://example.se/integritetsinst%C3%A4llningar` is not returned (percent-encoded); an NFD `Integritetsinställningar` text is not returned; a mixed list `[settings link, policy link]` returns the policy link (not `null`); Tori's `Mainosasetukset` is not returned; text `Tietosuoja` with href `https://privacysettings.vend.fi/` is not returned (host rule).
  - English stays as today: text `Privacy Policy & Cookie Settings` (href `/privacy`) **is** returned; text `Privacy Policy` with href `/account/settings/privacy-policy` **is** returned.
  - Order: a shadow candidate listed **before** a matching light candidate → the light one is returned; with only a shadow candidate it is returned.
  - `javascript:` is skipped. Text-only NFD match: `Mentions légales`.normalize("NFD") with a neutral href `/legal/1` still matches (the `l.gales` stem fails on NFD without NFC). A German `Datenschutzerklärung` NFD test is **not** a valid NFC test (the stem `datenschutz` ends before the accent); do not use it as one.
  - Invariant: every entry of `aggregateLocales().privacyUrl` matches `/^[\x00-\x7f]*$/`.
- [ ] **Step 2: Failing browser tests** (one `setContent` per case + inline `attachShadow` script; every negative page also holds a valid light-DOM policy link **after** the bad one, and the test asserts that href, so a crash inside `evaluate` cannot pass as "no match"): policy link in an open shadow root is found; nested open shadow roots are found; shadow host placed **before** a matching light link in the DOM → the light link; a link inside a closed shadow root is skipped and does not throw (regression guard: passes on current code); a `javascript:` link with policy text inside an open shadow root is not returned; a scoped call (`findPrivacyPolicyUrl(page, "#modal")`) finds a link in a shadow root inside the modal; all Task 1 baseline pins still hold unchanged (scope, `/account/settings/privacy-policy`, `Privacy Policy & Cookie Settings`, `Paramètres de confidentialité`).
- [ ] **Step 3: Run to verify they fail.**
- [ ] **Step 4: Implement** as specified above; append `/privacy/([a-z]{2}-)?polic` to the `en` module's `urlStems`, and add the same stem to the expected URL set in the Task 2 test (the only intended change to the old list).
- [ ] **Step 5: Run** `UNIT` and `E2E tests/e2e/privacy-link-baseline.test.ts tests/e2e/privacy-link.test.ts`: PASS.
- [ ] **Step 6: Commit.** `feat: find privacy policy links inside open shadow roots`.

### Task 6: Finnish and the combined-label mechanism

**Files:**
- Create: `src/locales/fi.ts`; register in `src/locales/index.ts`
- Modify: `resolveButtonPatterns`, `classifyButtonType`, `classifyButtonText`, `extractButtons` in `src/scanner/consent-modal.ts`
- Test: `tests/scanner/button-classification.test.ts`, `tests/analyzers/wording.test.ts`, `tests/scanner/privacy-link.test.ts`

**Interfaces:**
- `classifyButtonType(text, accept, reject, preferences, combinedPreferences: RegExp[])` tests `combinedPreferences` **before** reject and returns `"preferences"`. `resolveButtonPatterns` also returns `combinedPreferences`.
- Vocabulary: spec "Vocabulary" table, fi column plus the assumed list. Finnish `combinedPreferences` = preferences verb + `tai` + reject verb **in either order** (observed: `Muokkaa tai kiellä`; also `Hylkää tai muokkaa`, `Hallitse tai hylkää`). Bare `kiellä` is not in `reject`.

- [ ] **Step 1: Failing tests** in a `describe("classifyButtonText — fi")` block:
  - Accept `Hyväksy kaikki`, `HYVÄKSY KAIKKI`, `Salli kaikki`, `Hyväksyn`, `Hyväksyn kaikki`; reject `Hylkää kaikki`, `HYLKÄÄ KAIKKI`, bare `Hylkää`, the `.normalize("NFD")` form of `Hylkää kaikki`, `Kieltäydy`, `Vain välttämättömät`, `Vain pakolliset`, `Ei kiitos`, `Jatka ilman hyväksymistä`; preferences `Muokkaa tai kiellä`, `Hylkää tai muokkaa`, `Asetukset`, `Evästeasetukset` (compound), `Hallitse`, `Mukauta`.
  - Not reject: `Kiellä`, the heading `Välttämättömät evästeet`. English pin: `classifyButtonText("Manage or reject", "en")` is still `"reject"`.
  - Wording: `analyzeButtonWording([reject "Jatka ilman hyväksymistä"]).hasIndirectRejectLabel` is `true`.
  - Info, `it.each` **one stem per case**, capitalised at the start and at the end of the text: `tarkoituksiin`, `mainontakumppania`, `kumppaneiden`, `kolmannet osapuolet`, `kolmansille osapuolille`, `kolmansien osapuolten`, `muuttaa`, `peruuttaa`, `peruutan`. Each is reported as found. Negatives (all three concepts reported missing): `Käytämme evästeitä` and the realistic paragraph `Käytämme evästeitä. Muut evästeet ovat välttämättömiä sivuston toiminnalle.`
  - Privacy (`selectPrivacyPolicyUrl` with aggregated patterns): `Tietosuojakäytäntö`, `Tietosuojakäytännön`, `TIETOSUOJAKÄYTÄNTÖ`, `Tietosuoja- ja evästekäytäntö`, `Tietosuojaseloste`, `Rekisteriseloste`, URLs `https://example.fi/tietosuojakaytanto` and `…/tietosuojak%C3%A4yt%C3%A4nt%C3%B6` match; negatives `Tietosuojavastaava` (data protection officer), `Poista tietoni`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** the mechanism and `fi.ts` (anchoring per the Global Constraints; privacy stem `tietosuoja`, `rekisteriseloste`; tighten or exclude until the negatives pass; info stems `tarkoitu`, `kumppan`, `osapuol`, `muutta`, `peru(u|ut)`). Do not use `muut`.
- [ ] **Step 4: Run** `UNIT`: PASS, golden unchanged (it holds no Nordic strings, and its collision probes still report "missing").
- [ ] **Step 5: Commit.** `feat: add Finnish consent vocabulary and combined-label rule`.

### Task 7: Swedish

**Files:** Create `src/locales/sv.ts`; register in `index.ts`. Test: same three files as Task 6.

**Interfaces:** Consumes the Task 6 mechanism. Vocabulary: spec table, sv column plus assumed list; privacy stems `personuppgift`, `integritet`. Third-party stems are Swedish-specific (`tredje part`, `samarbetspartner`, `våra partners`): plain `partners` would collide with en/nl.

- [ ] **Step 1: Failing tests** (`describe("… — sv")`):
  - Accept `Godkänn alla`, `GODKÄNN ALLA`, the `.normalize("NFD")` form of `Godkänn alla`, bare `Godkänn`, `Acceptera alla`, `Jag godkänner`, `Tillåt alla`; reject `Avvisa alla`, bare `Avvisa`, `Neka`, `Nej tack`, `Endast nödvändiga`, `Fortsätt utan att godkänna`; preferences `Hantera eller avvisa` (combined), `Avvisa eller anpassa` (combined, other order), `Inställningar`, `Cookieinställningar` (compound), `Anpassa`. Not reject: heading `Nödvändiga cookies`.
  - Wording: `hasIndirectRejectLabel` is `true` for `Fortsätt utan att godkänna`.
  - Info, one stem per case (start and end of text): `ändamål`, `våra partners`, `samarbetspartners`, `tredje part`, `ändra`, `återkalla`, `dra tillbaka`; negatives `Vi använder cookies` and `Vi använder cookies. Andra cookies är nödvändiga för att webbplatsen ska fungera.`. NFD test: `"Vi använder cookies för ändamål".normalize("NFD")` does not report purposes missing (this is the Task 4 NFC info test; it fails without NFC).
  - Privacy: `Personuppgifts- och cookiepolicy`, `Integritetspolicy`, `Personuppgiftspolicy`, `https://example.se/integritetspolicy` match; `Integritetsinställningar`, `https://example.se/integritetsinst%C3%A4llningar` and `Radera personuppgifter` do not.
- [ ] **Step 2: Run to verify they fail.** **Step 3: Implement** `sv.ts` (anchoring per the Global Constraints). **Step 4: Run** `UNIT`: PASS. **Step 5: Commit.** `feat: add Swedish consent vocabulary`.

### Task 8: Norwegian

**Files:** Create `src/locales/no.ts` (Bokmål and Nynorsk in one); register. Test: same files.

**Interfaces:** Vocabulary: spec table, no column plus assumed list; privacy stems `personvern`, `personopplysning`. Third-party stems `tredjepart`, `partnere`, `partnerne`, `partnar` (Nynorsk); withdrawal uses a gap pattern so `trekke samtykket tilbake` matches (`trekk\w*\s+(\S+\s+){0,3}tilbake`, Nynorsk `trekkje`), and `endre` keeps both anchors.

- [ ] **Step 1: Failing tests** (`— no`):
  - Bokmål: accept `Godta alle`, `GODTA ALLE`, `Aksepter alle`, `Jeg godtar`, `Tillat alle`; reject `Avvis alle`, `Avslå`, `AVSLÅ`, the `.normalize("NFD")` form of `Avslå`, `Kun nødvendige`, `Nei takk`, `Fortsett uten å godta`; preferences `Tilpass eller avvis` (combined), `Avvis eller tilpass` (combined, other order), `Innstillinger`, `Cookieinnstillinger` (compound), `Administrer`. Not reject: `Nødvendige cookies`.
  - **Nynorsk** (`nn-NO`, assumed vocabulary): `Innstillingar` (preferences), `Berre naudsynte` (reject), `Tillat alle` (accept), withdrawal `trekkje tilbake`, third-party `partnar`.
  - Wording: `hasIndirectRejectLabel` is `true` for `Fortsett uten å godta`.
  - Info, one stem per case (start and end): `formål`, `partnere`, `tredjepart`, `endre`, `trekke tilbake`, `trekke samtykket tilbake`; negatives `Vi bruker cookies`, `Vi bruker cookies. Andre cookies er nødvendige for at nettstedet skal fungere.`, and the French text `Vous pouvez rendre visite` still reports withdrawal missing (collision guard for `endre`/`rendre`).
  - Privacy: `Personvernerklæring`, `Personvern- og cookieerklæring`, `Personvernpolicy`, `Personopplysninger`-policy link text, URLs `…/personvernerklaering` and `…/personvernerkl%C3%A6ring` match; `Personverninnstillinger` and `Personvernombud` do not.
- [ ] **Steps 2–5** as Task 7. Commit: `feat: add Norwegian consent vocabulary`.

### Task 9: Danish

**Files:** Create `src/locales/da.ts`; register. Test: same files.

**Interfaces:** Vocabulary: spec table, da column plus assumed list; privacy stems `privatliv`, `personoplysning`, `persondata`, `cookiepolitik`. Accept is `tillad alle`, not bare `tillad`. `da.preferences` includes `udvalgte` (so `Tillad udvalgte` is preferences) and `tilpas`. Third-party stems `tredjepart`, `partnere`, `partnerne`; withdrawal `ændre`, `tilbagekald`, gap pattern `trække\s+(\S+\s+){0,3}tilbage`.

- [ ] **Step 1: Failing tests** (`— da`):
  - Accept `Tillad alle`, `Accepter alle`, `Godkend`, `Godkend alle`; **`Tillad udvalgte` is `preferences`, not accept**; reject `Afvis alle`, bare `Afvis`, `Fravælg`, `Kun nødvendige`, `Nej tak`, `Fortsæt uden at acceptere`; preferences `Tilpas eller afvis` (combined), `Afvis eller tilpas` (combined, other order), `Indstillinger`, `Cookieindstillinger` (compound), `Tilpas tjenester` (observed layer heading). Not reject: `Nødvendige cookies`.
  - Wording: `hasIndirectRejectLabel` is `true` for `Fortsæt uden at acceptere`.
  - Info, one stem per case (start and end): `formål`, `reklamepartnere`, `tredjepart`, `ændre`, `tilbagekalde`, `trække samtykket tilbage`; negatives `Vi bruger cookies`, `Vi bruger cookies. Andre cookies er nødvendige for at hjemmesiden fungerer.`
  - Privacy: `Privatlivspolitik`, `Persondatapolitik`, `Cookiepolitik`, `hvordan Vend behandler dine personoplysninger`, `https://example.dk/privatlivspolitik` match; `Privatlivsindstillinger`, `Slet persondata` and `Anmod om indsigt i personoplysninger` do not (tighten the stems or exclude those verbs until they pass; spec decision 2 keeps `personoplysning`/`persondata` only as policy compounds or phrases).
- [ ] **Steps 2–5** as Task 7. Commit: `feat: add Danish consent vocabulary`.

### Task 10: End-to-end fixtures per language

**Files:**
- Create: `tests/e2e/fixtures/compliant-site-{fi,sv,no,da}.html`
- Modify: `tests/e2e/scanner.test.ts` (`makeOptions(fixture, locale = "en-US")`)

- [ ] **Step 1: Write four fixtures** modelled on `compliant-site.html` (`#cookie-banner`, accept + reject buttons, cookie set only on click), with `<html lang="fi|sv|nb|da">`. The banner text carries the language's purposes, third-party and withdrawal words; button labels are the observed accept label and a plain reject label (`Hylkää kaikki`, `Avvisa alla`, `Avvis alle`, `Afvis alle`). **All policy links use neutral hrefs** (`/legal/<xx>-modal`, `/legal/<xx>-footer`), so only the Nordic link text can match, never a URL stem.
  - **fi:** no light-DOM policy link at all. The banner holds a shadow host whose open shadow root contains the modal policy link (`Tietosuoja- ja evästekäytäntö`, `/legal/fi-modal`), and a `<footer>` shadow host contains `Tietosuojakäytäntö` (`/legal/fi-footer`).
  - **sv, da:** light-DOM banner link and footer link.
  - **no:** light DOM as above, plus an extra banner button `Tilpass eller avvis` (opens a dummy second layer, sets no cookie) next to `Avvis alle`.
- [ ] **Step 2: Failing tests.** For each fixture, a `describe` that scans with the matching locale (`fi-FI`, `sv-SE`, `nb-NO`, `da-DK`) and asserts: `modal.detected`; each button's **type by its text** (accept label → `accept`, reject label → `reject`); `modal.privacyPolicyUrl` and `privacyPolicyUrl` equal the **exact** expected hrefs (fi: modal link `/legal/fi-modal`; the page-level link is the first match in document order, assert it exactly); the scan's `errors` list is empty; no `compliance.issues` entry has severity `critical`, and none has a description mentioning `"purposes"`, `"third-parties"` or `"withdrawal"` (`duration` may be reported: its pattern is not Nordic-aware, by design). In the **no** fixture also assert: `Tilpass eller avvis` is typed `preferences`, exactly one button is typed `reject` (`Avvis alle`), no `no-reject-button` issue, and no consent-requiring cookie remains after reject. Put one decomposed label (`a` + combining diaeresis, built with `.normalize("NFD")` in the test's HTML string) in one fixture to prove extracted button text is NFC.
- [ ] **Step 3: Run** `E2E tests/e2e`: PASS. **Step 4: Commit.** `test: add Nordic e2e fixtures`.

### Task 11: Live verification, docs, changeset

**Files:** Create `.changeset/nordic-locales.md`; modify `README.md`.

- [ ] **Step 1: Full checks.** `bun run lint`, `bun run format`, `bun run typecheck`, and `bun run test` with the `PLAYWRIGHT_BROWSERS_PATH` prefix, outside the sandbox: all pass.
- [ ] **Step 2: Live scans** (outside the sandbox, with the browser env): `bun src/cli.ts scan <url> --locale <loc> --format json -o /private/tmp/claude/nordic-live` for `https://www.tori.fi fi-FI`, `https://www.blocket.se sv-SE`, `https://www.finn.no nb-NO`, `https://www.dba.dk da-DK`. Expected `privacyPolicyUrl` in each JSON: starts with `https://vend.com/privacy/` (observed `fi-policy`; the other suffixes are expected, not confirmed; baseline was `null` for all four). Treat this as "expected, verify" rather than a hard assert: a light-DOM header link matching a Nordic stem would win over the footer. If it is still `null`, check timing first: `findPrivacyPolicyUrl(session1.page)` runs right after load (`src/scanner/index.ts`) and the `<finn-footer>` may not have rendered yet. `modal.detected` stays `false` (iframe CMP, a documented non-goal).
- [ ] **Step 3: Docs.** `README.md`: one line stating the languages whose consent UIs are recognised (locate the detection section with `grep -n -i detect README.md`) and that modals in cross-origin iframes are not read yet. `.changeset/nordic-locales.md` with `"@slashgear/gdpr-cookie-scanner": minor` and a summary of what changed and why (false findings on Nordic sites; shadow-root footers), that vocabulary beyond the observed terms is assumed and needs native review, and the two deliberate behaviour changes for existing locales (NFC, the `/privacy/xx-policy` URL stem).
- [ ] **Step 4: Commit.** `feat: recognise Finnish, Swedish, Norwegian and Danish consent UIs`.
