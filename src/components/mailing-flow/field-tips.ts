/**
 * What each field means, from bpost's guide (MailingCreate, Mail-ID Data Exchange Technical Guide)
 * and the manual of the Address File Tool, in plain words for the hover tip next to the label.
 */
export const FIELD_TIPS = {
  customer: 'Naam van de klant voor wie je deze mailing verstuurt.',
  title: 'Een naam om de mailing terug te vinden in je overzicht.',
  code: 'Jouw unieke referentie voor deze mailing bij bpost. Maximaal 20 tekens.',
  date: 'De dag waarop je de brieven bij bpost afgeeft: een werkdag, van maandag tot vrijdag en geen feestdag.',
  format:
    'Het formaat van je brieven. Klein formaat: afgifte met Mail ID, gesorteerd of niet. Groot formaat: afgifte op ronde en sequentie.',
  priority: 'Prior of non-prior: hoe snel bpost je brieven bezorgt. Geldt voor elke brief van de mailing.',
  barcode:
    'Of bpost de Mail ID-barcodes voor je maakt, met 7, 9 of 11 cijfers. Kies Geen als je de barcodes zelf meegeeft.',
  presort: 'bpost maakt de presorteercodes, voor brieven die je niet zelf sorteerde.',
  roundSequence:
    'Enkel bij groot formaat. bpost geeft per brief een sequentie, die je op de envelop drukt om de brieven in de juiste volgorde af te geven.',
} as const
