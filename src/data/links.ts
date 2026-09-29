export const APP_URL = 'https://9a75633c-a3a2-490e-bafe-e3cf282383c8.web.bilt.me';

// Official pages Hej may cite (all taken from the app's own data).
export const OFFICIAL: [url: string, title: string][] = [
  ['https://lifeindenmark.borger.dk/coming-to-denmark', 'Life in Denmark: coming to Denmark'],
  ['https://lifeindenmark.borger.dk/theme/before-moving', 'Life in Denmark: before moving'],
  ['https://lifeindenmark.borger.dk/coming-to-denmark/cpr-bank-nemid-mitid', 'Life in Denmark: CPR, bank and MitID'],
  ['https://lifeindenmark.borger.dk/housing-and-moving', 'Life in Denmark: housing and moving'],
  ['https://lifeindenmark.borger.dk/healthcare', 'Life in Denmark: healthcare'],
  ['https://lifeindenmark.borger.dk/money-and-tax', 'Life in Denmark: money and tax'],
  ['https://lifeindenmark.borger.dk/apps-and-digital-services/Digital-Post', 'Life in Denmark: Digital Post'],
  ['https://www.nyidanmark.dk/', 'New to Denmark: residence and work permits'],
  ['https://www.mitid.dk/en-gb/', 'MitID'],
  ['https://skat.dk/en-us/individuals', 'Danish Tax Agency'],
  ['https://ihcph.kk.dk/', 'International House Copenhagen'],
  [
    'https://international.aarhus.dk/live/citizen-service-borgerservice/book-an-appointment-with-citizen-service-borgerservice',
    'Citizen Service, Aarhus',
  ],
  ['https://www.odense.dk/borger/borgerservice', 'Borgerservice, Odense'],
  ['https://www.aalborg.dk/mit-liv/personlige-forhold/borgerservice', 'Borgerservice, Aalborg'],
  ['https://www.kultunaut.dk/UK/', 'KultuNaut event guide'],
  ['https://www.visitdenmark.com/denmark/things-do/events', 'VisitDenmark events'],
];
export const OFFICIAL_HOSTS = new Set(OFFICIAL.map(([u]) => new URL(u).hostname));
export const HELP_LINKS: [url: string, label: string][] = [
  ['https://lifeindenmark.borger.dk/coming-to-denmark', 'Life in Denmark'],
  ['https://ihcph.kk.dk/', 'International House Copenhagen'],
  ['https://www.nyidanmark.dk/', 'New to Denmark'],
  ['https://skat.dk/en-us/individuals', 'Danish Tax Agency'],
  ['https://www.mitid.dk/en-gb/', 'MitID'],
];
