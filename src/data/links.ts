export const APP_URL = 'https://9a75633c-a3a2-490e-bafe-e3cf282383c8.web.bilt.me';

// Official pages Hej may cite (all taken from the app's own data). Links elsewhere in the data must use these hosts,
// or the Journey hides them; the tests check this.
export const OFFICIAL: [url: string, title: string][] = [
  ['https://lifeindenmark.borger.dk/settle-in-denmark', 'Life in Denmark: settle in Denmark'],
  ['https://lifeindenmark.borger.dk/theme/before-moving', 'Life in Denmark: before moving'],
  [
    'https://lifeindenmark.borger.dk/theme/when-you-arrive',
    'Life in Denmark: when you arrive (CPR, health card, tax card, bank, MitID)',
  ],
  [
    'https://lifeindenmark.borger.dk/settle-in-denmark/residence-in-denmark/residence-in-denmark-for-eu-eea-swiss-citizens',
    'Life in Denmark: residence for EU, EEA and Swiss citizens',
  ],
  [
    'https://lifeindenmark.borger.dk/settle-in-denmark/ics-international-citizen-service',
    'Life in Denmark: International Citizen Service',
  ],
  ['https://lifeindenmark.borger.dk/housing-and-moving', 'Life in Denmark: housing and moving'],
  [
    'https://lifeindenmark.borger.dk/housing-and-moving/rental-property/renting-a-home',
    'Life in Denmark: renting a home',
  ],
  [
    'https://lifeindenmark.borger.dk/housing-and-moving/housing-benefits',
    'Life in Denmark: housing benefit (boligstøtte)',
  ],
  [
    'https://www.borger.dk/bolig-og-flytning/boligstoette-oversigt/boligstoette-i-saerlige-situationer/boligstoette-saerligt-for-dig-der-er-studerende',
    'borger.dk: housing benefit for students (in Danish)',
  ],
  [
    'https://international.kk.dk/live/housing/finding-a-place-to-live/average-renting-costs',
    'City of Copenhagen: rents, deposit and prepaid rent',
  ],
  ['https://lifeindenmark.borger.dk/healthcare', 'Life in Denmark: healthcare'],
  ['https://lifeindenmark.borger.dk/money-and-tax', 'Life in Denmark: money and tax'],
  ['https://lifeindenmark.borger.dk/apps-and-digital-services/mitid', 'Life in Denmark: MitID'],
  [
    'https://lifeindenmark.borger.dk/leisure-and-networking/danish-language-training',
    'Life in Denmark: learning Danish',
  ],
  ['https://lifeindenmark.borger.dk/apps-and-digital-services/Digital-Post', 'Life in Denmark: Digital Post'],
  ['https://www.nyidanmark.dk/', 'New to Denmark: residence and work permits'],
  [
    'https://www.nyidanmark.dk/en-GB/Words-and-concepts/SIRI/Work-permits-for-students-in-higher-educational-programmes',
    'New to Denmark: working while you study',
  ],
  [
    'https://www.nyidanmark.dk/en-GB/Words-and-concepts/SIRI/Public-benefits-when-you-have-a-residence-permit-or-an-EU-residence-document-from-SIRI/Public-benefits-when-you-have-been-granted-a-permit-by-SIRI',
    'New to Denmark: public benefits you can’t receive on a permit, including as a student',
  ],
  ['https://www.mitid.dk/en-gb/', 'MitID'],
  ['https://skat.dk/en-us/individuals', 'Danish Tax Agency'],
  ['https://www.su.dk/', 'SU: Danish state education support'],
  ['https://studyindenmark.dk/', 'Study in Denmark'],
  ['https://www.workindenmark.dk/', 'Work in Denmark'],
  ['https://job.jobnet.dk/', 'Jobnet'],
  ['https://ihcph.kk.dk/', 'International House Copenhagen'],
  [
    'https://international.aarhus.dk/live/citizen-service-borgerservice/book-an-appointment-with-citizen-service-borgerservice',
    'Citizen Service, Aarhus',
  ],
  ['https://www.odense.dk/borger/borgerservice', 'Borgerservice, Odense'],
  [
    'https://lifeindenmark.borger.dk/settle-in-denmark/ics-international-citizen-service/ics-north-in-aalborg',
    'International Citizen Service North, Aalborg',
  ],
  ['https://bibliotek.kk.dk/arrangementer', 'Copenhagen Libraries: events'],
  ['https://www.aakb.dk/arrangementer', 'Aarhus Libraries: events'],
  ['https://www.odensebib.dk/arrangementer', 'Odense Libraries: events'],
  ['https://www.aalborgbibliotekerne.dk/arrangementer', 'Aalborg Libraries: events'],
  ['https://www.kultunaut.dk/UK/', 'KultuNaut event guide'],
  ['https://www.visitdenmark.com/denmark/things-to-do/events/event-calendar', 'VisitDenmark event calendar'],
];
export const OFFICIAL_HOSTS = new Set(OFFICIAL.map(([u]) => new URL(u).hostname));
export const HELP_LINKS: [url: string, label: string][] = [
  ['https://lifeindenmark.borger.dk/settle-in-denmark', 'Life in Denmark'],
  ['https://ihcph.kk.dk/', 'International House Copenhagen'],
  ['https://www.nyidanmark.dk/', 'New to Denmark'],
  ['https://skat.dk/en-us/individuals', 'Danish Tax Agency'],
  ['https://www.mitid.dk/en-gb/', 'MitID'],
];
