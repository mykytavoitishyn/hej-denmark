import type { CityId, HousingKind } from '../types.js';
import type { IconName } from './icons.js';

export interface HousingResource {
  name: string;
  url: string;
  kind: HousingKind;
  /** The cities it covers. Missing means all of Denmark. */
  cities?: CityId[];
  note: string;
  /** Short facts shown as tags, such as “Free” or “Paid subscription”. */
  tags?: string[];
}

export interface HousingTip {
  icon: IconName;
  title: string;
  text: string;
  source?: { label: string; url: string };
}

export const HOUSING_KINDS: Record<HousingKind, { label: string; icon: IconName; intro: string }> = {
  official: {
    label: 'Official help',
    icon: 'ShieldCheck',
    intro: 'Rules, rights and support from public authorities.',
  },
  student: {
    label: 'Student housing',
    icon: 'GraduationCap',
    intro: 'Dorms (kollegier) and youth housing, allocated by housing offices and universities.',
  },
  nonprofit: {
    label: 'Non-profit housing',
    icon: 'Building2',
    intro: 'Affordable homes from housing associations. Mostly through waiting lists, so sign up early.',
  },
  portal: {
    label: 'Rental sites',
    icon: 'Search',
    intro: 'Private rentals. Popular, but check the landlord and never pay before you’ve seen the home.',
  },
  community: {
    label: 'Facebook groups',
    icon: 'UsersRound',
    intro: 'Rooms and sublets posted by people. Useful and fast-moving, but scams are common here.',
  },
  temporary: {
    label: 'Temporary stays',
    icon: 'BedDouble',
    intro: 'Somewhere to stay while you search. Most can’t be used to register for a CPR number.',
  },
};

export const HOUSING_RESOURCES: HousingResource[] = [
  {
    name: 'Life in Denmark: housing',
    url: 'https://lifeindenmark.borger.dk/housing-and-moving',
    kind: 'official',
    note: 'The official guide to finding and renting a home in Denmark.',
    tags: ['Official'],
  },
  {
    name: 'BoligPortal',
    url: 'https://www.boligportal.dk/',
    kind: 'portal',
    note: 'One of the largest rental sites in Denmark.',
  },
];

export const SCAM_SIGNS: string[] = [
  'The landlord is abroad and offers to send the keys after you pay.',
  'You’re asked for a deposit before you’ve seen the home or signed a lease.',
  'The rent is far below similar homes nearby.',
  'You’re pushed to decide or pay fast, or to pay by money transfer service or crypto.',
  'The photos also appear in other listings under different names.',
];

export const HOUSING_TIPS: HousingTip[] = [];

export const HOUSING_GLOSSARY: [term: string, meaning: string][] = [
  ['Kollegium', 'A student residence, usually a room with shared kitchen.'],
  ['Ungdomsbolig', 'Youth housing for students and young people, often a small flat.'],
  ['Almen bolig', 'Non-profit rental housing from a housing association, allocated by waiting list.'],
  ['Andelsbolig', 'A housing co-op. You buy a share and pay a monthly fee.'],
  ['Fremleje', 'Subletting. The main tenant rents out a room or the whole home to you.'],
  ['Depositum', 'The deposit, paid back when you move out minus the cost of any damage.'],
  ['Forudbetalt leje', 'Prepaid rent, used for your last months before you move out.'],
  ['A conto', 'Monthly advance payments for heating or water, settled once a year.'],
];
