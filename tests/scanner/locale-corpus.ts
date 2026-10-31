/**
 * Fixed input corpora for the locale characterization baseline.
 * The golden file (locale-baseline.golden.json) pins what the code returned for each entry
 * before the Nordic locale work. Do not add Nordic strings here.
 */

/** Labels fed to classifyButtonText(label, null). */
export const BUTTON_CORPUS: readonly string[] = [
  ...new Set([
    // en
    "Accept all",
    "Agree",
    "OK",
    "I accept",
    "Reject all",
    "Decline",
    "No thanks",
    "Refuse",
    "Manage cookies",
    "Customize",
    "Settings",
    "Close",
    "Learn more",
    // fr
    "Tout accepter",
    "J'accepte",
    "Valider",
    "Tout refuser",
    "Non merci",
    "Refus",
    "Tout rejeter",
    "Paramètres",
    "Personnaliser",
    "Préférences",
    // de
    "Alle akzeptieren",
    "Zustimmen",
    "Einverstanden",
    "Ablehnen",
    "Alle ablehnen",
    "Nein danke",
    "Einstellungen",
    "Anpassen",
    "Mehr Optionen",
    // es
    "Aceptar todo",
    "Aceptar",
    "Rechazar todo",
    "Rechazar",
    "No gracias",
    "Configurar",
    "Preferencias",
    "Opciones",
    // it
    "Accetta tutto",
    "Accetta",
    "Acconsento",
    "Rifiuta tutto",
    "Rifiuta",
    "No grazie",
    "Impostazioni",
    "Gestisci",
    "Preferenze",
    // nl
    "Alles accepteren",
    "Akkoord",
    "Alles weigeren",
    "Weigeren",
    "Nee bedankt",
    "Instellingen",
    "Voorkeuren",
    "Aanpassen",
    // pl
    "Zaakceptuj wszystkie",
    "Zaakceptuj",
    "Zgadzam się",
    "Odrzuć wszystkie",
    "Odrzuć",
    "Nie zgadzam się",
    "Ustawienia",
    "Dostosuj",
    "Preferencje",
    // pt
    "Aceitar tudo",
    "Aceitar",
    "Concordo",
    "Rejeitar tudo",
    "Recusar",
    "Não obrigado",
    "Configurações",
    "Preferências",
    "Opções",
    // "continue without accepting" dark pattern
    "Continuer sans accepter",
    "Continue without accepting",
    "Continue without consent",
    "Continuar sin aceptar",
    // whitespace normalisation
    "Tout\nrefuser",
    "Accept\nall",
    "Reject\tall",
    "Tout\taccepter",
    "Tout refuser",
    "Accept all",
    "Alle ablehnen",
    "Reject  all",
    "Tout   accepter",
    "  Accept all  ",
    "\nTout refuser\n",
    "\n  Tout refuser\t",
    " Accept\n\tall ",
    // extra probes
    "Manage or reject",
    "Continue without accepting",
    "Nécessaires uniquement",
  ]),
];

/** Texts fed to analyzeModalText(text).missingInfo. */
export const INFO_CORPUS: readonly string[] = [
  ...new Set([
    // tests/analyzers/wording.test.ts
    `
    We use cookies to improve your experience. The purposes include analytics and advertising.
    Third-party partners and vendors process data on our behalf.
    Cookies are retained for a period of 13 months. You can withdraw your consent at any time.
  `,
    "We use cookies. Third-party partners. 13 months. Withdraw consent.",
    "We use cookies for analytics purposes. 13 months. Withdraw consent.",
    "We use cookies for security purposes. Third-party partners. Withdraw consent.",
    "We use cookies for analytics purposes. Third-party partners. 13 months.",
    "",
    "Finalité : améliorer votre expérience. Partenaires. 13 mois. Retrait du consentement.",
    // tests/unit/wording.test.ts
    [
      "We use cookies for analytics purposes with third-party vendors.",
      "Cookies expire after 13 months.",
      "You may withdraw your consent at any time.",
    ].join(" "),
    "We use cookies for purposes of tracking. Third-party vendors collect this. Possible to revoke consent.",
    "Nous utilisons des cookies pour des finalités de mesure et d'analyse.",
    "Vos données sont partagées avec nos partenaires.",
    "La durée de conservation est de 13 mois.",
    "Vous pouvez retirer votre consentement à tout moment.",
    // one sentence per existing locale per concept
    "We use cookies for measurement purposes.",
    "We share data with third parties.",
    "Cookies expire after twelve months.",
    "You can withdraw your consent at any time.",
    "Nous utilisons des cookies pour la finalité de mesure d'audience.",
    "Nous transmettons vos données à des tiers.",
    "La validité du cookie est limitée.",
    "Vous pouvez retirer votre accord à tout moment.",
    // collision probes: report the concept as missing today and must keep doing so
    "We share data with our partners and you can open the settings",
    "Wir und unsere Partner verwenden Cookies",
    "Wij en onze partners gebruiken cookies",
    "Vous pouvez nous rendre visite et prendre connaissance de nos conditions",
    "Other cookies are necessary for the site to work.",
    "D'autres cookies sont nécessaires au fonctionnement du site.",
    "Andere Cookies sind für den Betrieb der Seite notwendig.",
  ]),
];

/** Labels of a "reject" button fed to analyzeButtonWording(...).hasIndirectRejectLabel. */
export const INDIRECT_CORPUS: readonly string[] = [
  // one invented phrase per old INDIRECT_REJECT_LABELS regex, in order
  "Continue without ads",
  "Proceed without ads",
  "Browse without consent",
  "Continuer sans publicité",
  "Naviguer sans cookies",
  "Continuar sin anuncios",
  "Navegar sin aceptar",
  "Continua senza pubblicità",
  "Navigare senza consenso",
  "Weiter ohne Werbung",
  "Surfen ohne zustimmen",
  "Vervolgenen zonder reclame",
  "Verder zonder toestemming",
  // negatives
  "Reject all",
  "Continue",
  "Weiter",
];
