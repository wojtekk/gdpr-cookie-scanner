---
"@slashgear/gdpr-cookie-scanner": patch
---

Match privacy policy links through small text changes. Link text is now normalised before matching: invisible characters (soft hyphen, zero-width space) are dropped, Unicode dashes become `-` and all whitespace collapses to single spaces. The Swedish, Finnish and Norwegian "X- och/ja/og ..." patterns also accept a missing space after the hyphen or a space before it, so "Personuppgifts-och cookiepolicy" or an en dash no longer hides the policy link when its URL has no known stem.
