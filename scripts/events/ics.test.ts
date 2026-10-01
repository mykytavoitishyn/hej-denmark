import { describe, expect, it } from 'vitest';
import { parseIcs, zonedToUtc } from './ics.ts';

const cal = (...events: string[]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events.flatMap(e => ['BEGIN:VEVENT', e, 'END:VEVENT']), 'END:VCALENDAR'].join(
    '\r\n',
  );

describe('parseIcs', () => {
  it('reads a Luma event: UTC times, a folded description, the link inside it, place and position', () => {
    const [e] = parseIcs(
      cal(
        [
          'DTSTART:20261021T170000Z',
          'DTEND:20261021T200000Z',
          'ORGANIZER;CN="Dear World":MAILTO:calendar-invite@lu.ma',
          'UID:evt-zJIOyDQrYH0mtpQ@events.lu.ma',
          'SUMMARY:BAR NIGHT & POOL by Dear World',
          'DESCRIPTION:Get up-to-date information at: https://luma.com/ftf3po63\\n\\nAd',
          ' dress:\\nPool\\, Gothersgade 8C',
          'LOCATION:Pool, Gothersgade 8C, 1123 København, Denmark',
          'GEO:55.682024999999996;12.584816',
          'STATUS:TENTATIVE',
        ].join('\r\n'),
      ),
    );
    expect(e).toMatchObject({
      uid: 'evt-zJIOyDQrYH0mtpQ@events.lu.ma',
      summary: 'BAR NIGHT & POOL by Dear World',
      start: '2026-10-21T17:00:00.000Z',
      end: '2026-10-21T20:00:00.000Z',
      allDay: false,
      url: 'https://luma.com/ftf3po63',
      location: 'Pool, Gothersgade 8C, 1123 København, Denmark',
      geo: [55.682024999999996, 12.584816],
    });
    expect(e.description).toContain('Address:\nPool, Gothersgade 8C');
  });

  it('turns Copenhagen local times into UTC, in summer and in winter', () => {
    const [summer, winter] = parseIcs(
      cal(
        'DTSTART;TZID=Europe/Copenhagen:20261015T173000\r\nSUMMARY:Welcome to DK #210\r\nURL;VALUE=URI:https://www.meetup.com/copenhagen_expat_meetup/events/315733581/',
        'DTSTART;TZID=Europe/Copenhagen:20261204T170000\r\nSUMMARY:Welcome to DK #214',
      ),
    );
    expect(summer.start).toBe('2026-10-15T15:30:00.000Z');
    expect(summer.url).toBe('https://www.meetup.com/copenhagen_expat_meetup/events/315733581/');
    expect(winter.start).toBe('2026-12-04T16:00:00.000Z');
  });

  it('reads all-day events as starting at midnight in Copenhagen', () => {
    const [e] = parseIcs(cal('DTSTART;VALUE=DATE:20261224\r\nDTEND;VALUE=DATE:20261225\r\nSUMMARY:Christmas Eve'));
    expect(e).toMatchObject({ allDay: true, start: '2026-12-23T23:00:00.000Z', end: '2026-12-24T23:00:00.000Z' });
  });

  it('leaves out cancelled events and events without a start or a title', () => {
    const events = parseIcs(
      cal(
        'DTSTART:20261021T170000Z\r\nSUMMARY:Cancelled night\r\nSTATUS:CANCELLED',
        'SUMMARY:No start',
        'DTSTART:20261021T170000Z',
        'DTSTART:20261021T170000Z\r\nSUMMARY:Kept',
      ),
    );
    expect(events.map(e => e.summary)).toEqual(['Kept']);
  });

  it('ignores an end before the start', () => {
    const [e] = parseIcs(cal('DTSTART:20261021T170000Z\r\nDTEND:20261021T160000Z\r\nSUMMARY:Odd'));
    expect(e.end).toBeNull();
  });
});

describe('zonedToUtc', () => {
  it('handles the switch to summer time', () => {
    expect(new Date(zonedToUtc(2026, 3, 29, 1, 30, 0, 'Europe/Copenhagen')).toISOString()).toBe(
      '2026-03-29T00:30:00.000Z',
    );
    expect(new Date(zonedToUtc(2026, 3, 29, 3, 30, 0, 'Europe/Copenhagen')).toISOString()).toBe(
      '2026-03-29T01:30:00.000Z',
    );
  });
});
