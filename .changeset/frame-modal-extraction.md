---
"@slashgear/gdpr-cookie-scanner": minor
---

Add `extractModalFromFrame(frame, options)`, which reads a consent modal's text, buttons, checkboxes and privacy policy link from a Playwright `Frame`. Sourcepoint renders its modal in a cross-origin iframe that the scorer could not see, so those sites were scored as having no modal. `findPrivacyPolicyUrl` now accepts a `Frame` too, and the new `skipDisabledCheckboxes` option (off by default, so main-frame scoring is unchanged) ignores disabled toggles such as an always-on "strictly necessary" switch.
