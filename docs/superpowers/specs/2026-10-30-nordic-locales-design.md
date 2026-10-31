# Nordic locale support (fi, sv, no, da) — design

Date: 2026-10-30. Status: draft, awaiting approval.
Size: project (per-locale module refactor, four new locales, shadow-DOM link search, URL pattern fix).

## Intent

The scanner reports false findings on Finnish, Swedish, Norwegian and Danish consent UIs, such as
Tori, Blocket, FINN and DBA. It misses the privacy-policy link, reports purposes, third parties and
withdrawal as missing, and cannot classify the accept, reject and preferences buttons. The last one
can produce a critical "no reject button" finding. The fix teaches the scanner these four languages
and puts all per-language vocabulary in one module per locale, so a new language is one file.

## Baseline (unmodified scanner, 2026-10-30)

`scan https://www.tori.fi --locale fi-FI` gives 7/100, grade F, with "No cookie consent modal
detected" and "No privacy policy link found on the page".

Two separate causes, found by probing the live sites with a browser:

1. **The footer privacy link is inside a shadow root.** On Tori, Blocket, FINN and DBA the footer is a
   `<finn-footer>` custom element with an open shadow root. The policy link is there and nowhere in
   the light DOM:
   Tori `Tietosuojakäytäntö`, Blocket `Personuppgifts- och cookiepolicy`, FINN `Personvernerklæring`,
   DBA `Privatlivspolitik`, all pointing at `https://vend.com/privacy/<xx>-policy`.
   `findPrivacyPolicyUrl` calls `querySelectorAll` inside `page.evaluate`, which does not cross
   shadow boundaries, so vocabulary alone would still return null.
2. **The modal is in a cross-origin iframe.** All four brands use Sourcepoint
   (`#sp_message_container_<id>` → `iframe#sp_message_iframe_<id>` from `cmpv2.<brand>`). The container
   is visible with zero text. The scanner only searches the main frame, so it never sees the modal.

Neither the Nordic vocabulary nor the existing URL pattern helps with the link today:
`privacy[_-]?polic` needs the two words adjacent, and the URL has `/privacy/fi-policy`.

## Goals

- One module per locale holding that language's button patterns, indirect-reject phrases,
  privacy-link stems (text and URL) and info keywords (purposes, third parties, withdrawal).
  Existing en, fr, de, es, it, nl, pl, pt move into the same shape, with their patterns unchanged.
- New locales fi, sv, no (Bokmål and Nynorsk) and da.
- `findPrivacyPolicyUrl` also searches open shadow roots.
- The URL patterns match the `/privacy/…` path form used by all four brands, without matching
  privacy-settings pages (for example `privacysettings.vend.fi`, which is not the policy).
- Nordic characters (ä ö å æ ø) work: uppercase, decomposed Unicode, ASCII-folded and percent-encoded forms.

## Non-goals

- Reading modals inside iframes (Sourcepoint, or any CMP in an iframe). Separate follow-up. Until it
  lands, these four sites still report "no modal"; the page-level privacy link is what improves.
- Other languages, and walking shadow roots anywhere other than the privacy-link search.

## Anti-goals

- Existing fr, de, es, it, nl, pl and pt results must not change. The refactor moves patterns
  verbatim and is proven by the existing tests plus a check that the aggregated patterns equal the old ones.
- A combined "manage or reject" label must not be classified as reject.
- `privacysettings.*` or similar privacy-settings links must not be returned as the privacy policy.

## Constraints

- Link patterns are plain strings turned into `RegExp` inside `page.evaluate`, so they cannot be regex literals.
- `link.href` is percent-encoded by the browser (`æ` → `%C3%A6`). URL patterns therefore use ASCII stems only.
- JS `\b` does not treat ä ö å æ ø as word characters, so no `\b` next to one, at the start or the end of a
  word (`ändra`, `åpne`, `ændre`, `återkalla`, `hylkää`, `avslå`). Review found the Polish no-anchor workaround too
  wide for an all-locales matcher (`neka` would match inside German `Onlinekatalog`), so use `\b` where the adjacent
  character is ASCII and `(?<![\p{L}\p{M}])` / `(?![\p{L}\p{M}])` with the `u` flag where it is not. Short stems keep
  both anchors, verb stems take no trailing anchor, long distinctive stems may be unanchored (compounds such as
  `Cookieinnstillinger`).
- `resolveButtonPatterns` tests every locale at once, so a new term must not collide with an existing one.

## Approaches

- **A. Extend in place.** Add Nordic entries to the existing lists. Smallest diff, but each new language
  touches four files. Not chosen.
- **B. One module per locale (chosen, per review feedback).** Existing locales move into the same shape.
  Larger diff and rewrites working code, so regression safety is the main risk; see Verification.

## Decisions

1. **Combined labels are preferences, not reject.** Observed: "Muokkaa tai kiellä" (fi), "Hantera eller
   avvisa" (sv), "Tilpass eller avvis" (no). They open the second layer. Treating them as reject would make the
   reject phase click a layer toggle and report cookies persisting after reject. Bare `kiellä` stays out of the
   Finnish reject pattern. Needs a check before the reject-first test in `classifyButtonType`.
2. **Danish stems include `personoplysning` and `persondata`** as well as `privatliv`. DBA's modal link text
   is "hvordan Vend behandler dine personoplysninger" (unreachable until iframe support, but cheap to include).
3. **Swedish includes `integritet`** as well as `personuppgift` ("Integritetspolicy" is the common term).
4. **Danish accept is `tillad alle`, not bare `tillad`**, because "Tillad udvalgte" (allow selected) is a preferences label.
5. **Norwegian is one `no` module** covering Bokmål and Nynorsk (`lang` is ignored by the matcher anyway).

Calls made while resolving the builder check (author's calls, not discussed with the user; please check them):

6. **Settings links never win (narrow rule, user decision after plan review).** `findPrivacyPolicyUrl` first
   drops any candidate whose link text or URL host/path contains a **Nordic** settings word (`asetukset`,
   `inställning`, `innstilling`, `indstilling`), or whose URL **host name** contains `settings`, then returns the
   first remaining match. This stops "Tietosuoja-asetukset" or `privacysettings.vend.fi` from being returned as the
   policy. The Nordic words are tested against the percent-decoded, NFC-normalised URL (`%C3%A4` → `ä`). English
   `settings` in link text or URL path does **not** drop a link, so existing results are unchanged: a policy at
   `/account/settings/privacy-policy` or a link "Privacy Policy & Cookie Settings" is still returned. (A wider
   rule that dropped those was considered and rejected: it creates new "no privacy policy link" false findings on
   sites that pass today; English patterns never matched `privacysettings.*` hosts anyway.) The `/privacy/` URL
   pattern is narrow: `/privacy/([a-z]{2}-)?polic…` matches `/privacy/fi-policy` and `/privacy/policy`, and not
   `/privacy/settings`.
7. **The combined-label rule is Nordic-only, as per-locale data.** Each of fi, sv, no and da has a
   `combinedPreferences` pattern (preferences verb + `eller`/`tai` + reject verb), tested before reject. English
   "Manage or reject" keeps its current result (reject); a test pins it so it cannot change by accident.
   Danish "Tilpas eller afvis" is included for consistency, though not observed.
8. **NFC normalisation is added globally in `normalizeText`.** It only changes decomposed (NFD) input, which
   matches nothing today, so existing results are unchanged for composed text. This is the one deliberate touch of
   existing locales, covered by a test. "ASCII-folded" applies to URL stems only (`personvernerklaering`,
   `tietosuojakaytanto`). Button and info text patterns accept the native spelling only.
9. **Shadow roots are searched in both the page-level and the modal-scoped call, recursively through nested
   open roots.** A light-DOM match wins over a shadow-DOM match; within each, document order.
10. **Existing info keywords are split by locale.** The mixed en/fr regexes for purposes, third parties and
    withdrawal are split by alternative into the `en` and `fr` modules. The `duration` pattern stays untouched in
    `wording.ts` (see the open question). The "equals old" check compares behaviour over a corpus of strings,
    since the regex sources differ after the split, and also asserts that the union of the new alternatives equals
    the old alternatives.
11. **Info stems must not change existing-language results (added after plan review).** All info keywords feed one
    shared list, so a Nordic stem applies to every language. Verified on the unmodified code: English "our partners",
    German "unsere Partner" and Dutch "onze partners" currently report third-parties as missing, so a bare `partner(s)`
    stem would flip them. Nordic stems are therefore Nordic-specific (`våra partners`, `samarbetspartner`,
    `partnere`, `partnerne`, `partnar`), `endre` keeps both anchors (French `rendre`), and the Finnish withdrawal
    stems are `muutta` / `peru(u|ut)` (not `muut`, "other"). The baseline corpus carries collision probes.
12. **Nynorsk is covered by tests, not only claimed** (`innstillingar`, `berre naudsynte`, `trekkje tilbake`,
    `partnar`), as assumed vocabulary. Combined labels are accepted in both word orders. Indirect-reject phrases
    (`fortsätt utan att godkänna`, `fortsett uten å godta`, `fortsæt uden at acceptere`) get wording tests per locale.

## Vocabulary

Stems are matched; inflected and compound forms follow.

**Observed on the live sites (2026-10-30):**

| | fi (Tori) | sv (Blocket) | no (FINN) | da (DBA) |
|---|---|---|---|---|
| Accept | Hyväksy kaikki | Godkänn alla | Godta alle | Tillad alle |
| Reject | none on first layer | none on first layer | none on first layer | Kun nødvendige |
| Preferences | Muokkaa tai kiellä | Hantera eller avvisa | Tilpass eller avvis | Tillad udvalgte, Tilpas tjenester |
| Policy link, footer (light-DOM-invisible) | Tietosuojakäytäntö | Personuppgifts- och cookiepolicy | Personvernerklæring | Privatlivspolitik |
| Policy link, modal | Tietosuoja- ja evästekäytäntö | Personuppgifts- och cookiepolicy | Personvern- og cookieerklæring | …behandler dine personoplysninger |
| Purposes | tarkoituksiin | ändamål | formål | formål |
| Third parties | mainontakumppania | partners | partnere | reklamepartnere |
| Withdrawal | muuttaa | ändra | endre | ændre; trække samtykket tilbage |

**Assumed, standard wording, not seen on these sites. Needs native review:**

- fi: hylkää, kieltäydy, vain välttämättömät, salli kaikki, asetukset, hallitse, mukauta, tietosuojaseloste, peruuttaa, kolmannet osapuolet, jatka ilman hyväksymistä
- sv: avvisa alla, neka, endast nödvändiga, godkänn, inställningar, anpassa, integritetspolicy, återkalla, tredje part, fortsätt utan att godkänna
- no: avvis alle, avslå, kun nødvendige, godta, innstillinger, administrer, personvernerklæring, trekke tilbake, tredjepart, fortsett uten å godta
- da: afvis alle, afvis, nej tak, indstillinger, persondatapolitik, tilbagekalde, tredjepart, fortsæt uden at acceptere

## Verification

- **Regression:** all existing tests pass unchanged; a test asserts the aggregated button, link and info patterns for
  the eight existing locales equal the pre-refactor lists.
- **Unit, per new term** (button-classification and wording suites): uppercase (`HYLKÄÄ KAIKKI`), NFD-decomposed
  input, and for URLs the ASCII-folded and percent-encoded forms.
- **English pin:** "Manage or reject" still classifies as reject.
- **Negative cases:** "Nødvendige cookies" (heading) is not reject; the three combined labels are preferences;
  `https://privacysettings.vend.fi/…` is not a policy link; `https://vend.com/privacy/fi-policy` is.
- **Shadow DOM:** an e2e fixture with the policy link inside an open shadow root is found; one in the light DOM still is.
- **E2e fixtures:** one per language, with the modal in the main DOM (iframes are out of scope).
- **Live:** re-run the scanner on tori.fi, finn.no, blocket.se and dba.dk with the matching `--locale`.
  Baseline is "no privacy link" on all four. Expected: link found as `https://vend.com/privacy/<xx>-policy`;
  modal still undetected (iframe), as documented above.

## Open question

**The `duration` check.** `REQUIRED_INFO_PATTERNS.duration` contains `an(s)?`, which matches inside almost any
text, so the check passes by accident in every language. Option B does not fix this on its own: the pattern would
just move. Fixing it means replacing it with explicit per-locale duration terms, which will make modals that
pass by accident today start reporting "duration missing" in fr and en too. That changes existing scores, so it
needs a decision. Default if unanswered: leave as is and list it as a follow-up.

## Found along the way, not fixed here

- "Manage or reject" in English is classified as reject by the same reject-first ordering (pinned by a test, not changed).
- The fallback modal search and other `page.evaluate` DOM queries also skip shadow roots.
- Existing settings-link false positives: French "Paramètres de confidentialité" and German "Datenschutz-Einstellungen"
  (privacy *settings*) match the `confidentialit` / `datenschutz` stems and can be returned as the policy when they
  come first. Fixing it means adding `paramètres` / `einstellung` to the settings words, which changes fr/de results.
  Pinned by a baseline row, not changed here.

## Left to the builder

Module file layout and type shape, exact regex forms, test file layout, fixture content, how the
"aggregated patterns equal old ones" check is written, and where the combined-label check sits in `classifyButtonType`.
