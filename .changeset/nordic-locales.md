---
"@slashgear/gdpr-cookie-scanner": minor
---

Recognise Finnish, Swedish, Norwegian (Bokmål and Nynorsk) and Danish consent UIs, and find privacy links inside shadow-root footers.

Why: scanning Nordic sites (Tori, Blocket, FINN, DBA) produced false findings, because accept/reject/preferences wording and privacy-policy links were only recognised in the existing languages, and the privacy link on Vend sites lives in a `<finn-footer>` shadow root that the light-DOM search never saw. Detection vocabulary now lives in per-language modules under `src/locales/` and is aggregated at startup, and the privacy link search also looks inside open shadow roots.

Combined "manage or reject" labels (fi, sv, no, da) classify as preferences rather than reject. Vocabulary beyond the terms observed on live sites is ASSUMED and needs native-speaker review. Modals rendered in cross-origin iframes are not read yet.

Deliberate behaviour changes for existing locales:

- Consent text is NFC-normalised before matching, so decomposed Unicode forms now match.
- The English privacy URL stem `/privacy/([a-z]{2}-)?polic` is new, so links such as `/privacy/fi-policy` are recognised.
