import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getBondDeadline,
  getFinalizeBidDeadline,
  getFinalizeRfiDeadline,
  calculateInternalEvents,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateICS,
} from './calendar';
import type { FullProjectData, ExportOptions } from '../types';

describe('calendar utilities', () => {
  describe('getBondDeadline', () => {
    it('returns null for null input', () => {
      expect(getBondDeadline(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getBondDeadline('')).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(getBondDeadline('not-a-date')).toBeNull();
    });

    it('calculates 5 days before bid date', () => {
      const bidDate = '2025-01-15T17:00:00.000Z';
      const result = getBondDeadline(bidDate);
      expect(result).not.toBeNull();

      const resultDate = new Date(result!);
      const expectedDate = new Date('2025-01-10T17:00:00.000Z');
      expect(resultDate.getTime()).toBe(expectedDate.getTime());
    });

    it('handles dates crossing month boundaries', () => {
      const bidDate = '2025-02-03T17:00:00.000Z';
      const result = getBondDeadline(bidDate);
      expect(result).not.toBeNull();

      const resultDate = new Date(result!);
      // 5 days before Feb 3 = Jan 29
      expect(resultDate.getUTCMonth()).toBe(0); // January
      expect(resultDate.getUTCDate()).toBe(29);
    });

    it('handles dates crossing year boundaries', () => {
      const bidDate = '2025-01-03T17:00:00.000Z';
      const result = getBondDeadline(bidDate);
      expect(result).not.toBeNull();

      const resultDate = new Date(result!);
      // 5 days before Jan 3, 2025 = Dec 29, 2024
      expect(resultDate.getUTCFullYear()).toBe(2024);
      expect(resultDate.getUTCMonth()).toBe(11); // December
      expect(resultDate.getUTCDate()).toBe(29);
    });
  });

  describe('getFinalizeBidDeadline', () => {
    it('returns null for null input', () => {
      expect(getFinalizeBidDeadline(null)).toBeNull();
    });

    it('returns null for invalid date', () => {
      expect(getFinalizeBidDeadline('invalid')).toBeNull();
    });

    it('calculates 1 day before bid date', () => {
      const bidDate = '2025-01-15T17:00:00.000Z';
      const result = getFinalizeBidDeadline(bidDate);
      expect(result).not.toBeNull();

      const resultDate = new Date(result!);
      const expectedDate = new Date('2025-01-14T17:00:00.000Z');
      expect(resultDate.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe('getFinalizeRfiDeadline', () => {
    it('returns null for null input', () => {
      expect(getFinalizeRfiDeadline(null)).toBeNull();
    });

    it('returns null for invalid date', () => {
      expect(getFinalizeRfiDeadline('xyz')).toBeNull();
    });

    it('calculates 1 day before RFI date', () => {
      const rfiDate = '2025-01-10T12:00:00.000Z';
      const result = getFinalizeRfiDeadline(rfiDate);
      expect(result).not.toBeNull();

      const resultDate = new Date(result!);
      const expectedDate = new Date('2025-01-09T12:00:00.000Z');
      expect(resultDate.getTime()).toBe(expectedDate.getTime());
    });
  });

  describe('calculateInternalEvents', () => {
    it('returns data with calculated internal deadlines', () => {
      const data = {
        projectName: 'Test Project',
        agencyName: 'Test Agency',
        bidDueDate: '2025-01-15T17:00:00.000Z',
        rfiDueDate: '2025-01-10T17:00:00.000Z',
      };

      const result = calculateInternalEvents(data);

      expect(result.bondRequestDeadline).not.toBeNull();
      expect(result.finalizeBidPackageDeadline).not.toBeNull();
      expect(result.finalizeRfiDeadline).not.toBeNull();
    });

    it('preserves existing bidBondRequirement', () => {
      const data = {
        bidBondRequirement: '10%',
        bidDueDate: '2025-01-15T17:00:00.000Z',
      };

      const result = calculateInternalEvents(data);
      expect(result.bidBondRequirement).toBe('10%');
    });

    it('sets bidBondRequirement to null if not provided', () => {
      const data = {
        bidDueDate: '2025-01-15T17:00:00.000Z',
      };

      const result = calculateInternalEvents(data);
      expect(result.bidBondRequirement).toBeNull();
    });

    it('handles missing dates gracefully', () => {
      const data = {
        projectName: 'Test Project',
      };

      const result = calculateInternalEvents(data);
      expect(result.bondRequestDeadline).toBeNull();
      expect(result.finalizeBidPackageDeadline).toBeNull();
      expect(result.finalizeRfiDeadline).toBeNull();
    });
  });

  describe('generateGoogleCalendarUrl', () => {
    it('returns empty string for null date', () => {
      const result = generateGoogleCalendarUrl('Test Event', null, 'Description');
      expect(result).toBe('');
    });

    it('returns empty string for invalid date', () => {
      const result = generateGoogleCalendarUrl('Test Event', 'invalid', 'Description');
      expect(result).toBe('');
    });

    it('generates valid Google Calendar URL', () => {
      const result = generateGoogleCalendarUrl(
        'Test Event',
        '2025-01-15T17:00:00.000Z',
        'Event Description',
        '123 Main St'
      );

      expect(result).toContain('https://www.google.com/calendar/render');
      expect(result).toContain('action=TEMPLATE');
      expect(result).toContain('text=Test+Event');
      expect(result).toContain('details=Event+Description');
      expect(result).toContain('location=123+Main+St');
    });

    it('formats dates correctly for Google Calendar', () => {
      const result = generateGoogleCalendarUrl(
        'Event',
        '2025-01-15T17:00:00.000Z',
        'Desc'
      );

      // Date format should be YYYYMMDDTHHMMSSZ
      expect(result).toContain('20250115T170000Z');
    });

    it('creates 1-hour events', () => {
      const result = generateGoogleCalendarUrl(
        'Event',
        '2025-01-15T17:00:00.000Z',
        'Desc'
      );

      // Start time: 17:00, End time: 18:00
      expect(result).toContain('20250115T170000Z%2F20250115T180000Z');
    });

    it('handles empty location', () => {
      const result = generateGoogleCalendarUrl(
        'Event',
        '2025-01-15T17:00:00.000Z',
        'Desc'
      );

      expect(result).toContain('location=');
    });
  });

  describe('generateOutlookCalendarUrl', () => {
    it('returns empty string for null date', () => {
      const result = generateOutlookCalendarUrl('Test Event', null, 'Description');
      expect(result).toBe('');
    });

    it('returns empty string for invalid date', () => {
      const result = generateOutlookCalendarUrl('Test Event', 'not-valid', 'Description');
      expect(result).toBe('');
    });

    it('generates valid Outlook Calendar URL', () => {
      const result = generateOutlookCalendarUrl(
        'Test Event',
        '2025-01-15T17:00:00.000Z',
        'Event Description',
        '123 Main St'
      );

      expect(result).toContain('https://outlook.office.com/calendar/0/deeplink/compose');
      expect(result).toContain('rru=addevent');
      expect(result).toContain('subject=Test+Event');
      expect(result).toContain('body=Event+Description');
      expect(result).toContain('location=123+Main+St');
    });

    it('includes ISO 8601 formatted dates', () => {
      const result = generateOutlookCalendarUrl(
        'Event',
        '2025-01-15T17:00:00.000Z',
        'Desc'
      );

      expect(result).toContain('startdt=2025-01-15T17');
      expect(result).toContain('enddt=2025-01-15T18');
    });
  });

  describe('generateICS', () => {
    const mockProjectData: FullProjectData = {
      projectName: 'Downtown Building Renovation',
      agencyName: 'City Planning Department',
      projectAddress: '100 Main Street, Anytown, USA',
      projectDescription: 'Complete renovation of historic building',
      bidDueDate: '2025-01-15T17:00:00.000Z',
      rfiDueDate: '2025-01-10T17:00:00.000Z',
      siteVisitDate: '2025-01-05T10:00:00.000Z',
      isSiteVisitMandatory: true,
      rsvpDeadline: '2025-01-03T17:00:00.000Z',
      bidBondRequirement: '10%',
      bondRequestDeadline: '2025-01-10T17:00:00.000Z',
      finalizeRfiDeadline: '2025-01-09T17:00:00.000Z',
      finalizeBidPackageDeadline: '2025-01-14T17:00:00.000Z',
    };

    const defaultOptions: ExportOptions = {
      includeInternal: false,
      reminders: {
        oneHour: false,
        oneDay: false,
        threeDays: false,
        oneWeek: false,
      },
    };

    it('generates valid ICS header', () => {
      const result = generateICS(mockProjectData, defaultOptions);

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('VERSION:2.0');
      expect(result).toContain('PRODID:-//BidCalendarAI//Construction//EN');
      expect(result).toContain('CALSCALE:GREGORIAN');
      expect(result).toContain('METHOD:PUBLISH');
      expect(result).toContain('END:VCALENDAR');
    });

    it('includes external events by default', () => {
      const result = generateICS(mockProjectData, defaultOptions);

      expect(result).toContain('[BID DUE] Downtown Building Renovation');
      expect(result).toContain('[RFI DUE] Downtown Building Renovation');
      expect(result).toContain('[MANDATORY SITE VISIT] Downtown Building Renovation');
      expect(result).toContain('[RSVP] Site Visit: Downtown Building Renovation');
    });

    it('marks site visit as mandatory when isSiteVisitMandatory is true', () => {
      const result = generateICS(mockProjectData, defaultOptions);
      expect(result).toContain('[MANDATORY SITE VISIT]');
    });

    it('does not mark site visit as mandatory when isSiteVisitMandatory is false', () => {
      const data = { ...mockProjectData, isSiteVisitMandatory: false };
      const result = generateICS(data, defaultOptions);

      expect(result).not.toContain('[MANDATORY SITE VISIT]');
      expect(result).toContain('[SITE VISIT]');
    });

    it('excludes internal events when includeInternal is false', () => {
      const result = generateICS(mockProjectData, defaultOptions);

      expect(result).not.toContain('[INTERNAL] Bond Request');
      expect(result).not.toContain('[INTERNAL] Finalize RFI');
      expect(result).not.toContain('[INTERNAL] Final Bid Package');
    });

    it('includes internal events when includeInternal is true', () => {
      const options: ExportOptions = { ...defaultOptions, includeInternal: true };
      const result = generateICS(mockProjectData, options);

      expect(result).toContain('[INTERNAL] Bond Request');
      expect(result).toContain('[INTERNAL] Finalize RFI List');
      expect(result).toContain('[INTERNAL] Final Bid Package Prep');
    });

    it('adds 1-hour reminder when enabled', () => {
      const options: ExportOptions = {
        ...defaultOptions,
        reminders: { ...defaultOptions.reminders, oneHour: true },
      };
      const result = generateICS(mockProjectData, options);

      expect(result).toContain('BEGIN:VALARM');
      expect(result).toContain('TRIGGER:-PT1H');
      expect(result).toContain('END:VALARM');
    });

    it('adds 1-day reminder when enabled', () => {
      const options: ExportOptions = {
        ...defaultOptions,
        reminders: { ...defaultOptions.reminders, oneDay: true },
      };
      const result = generateICS(mockProjectData, options);

      expect(result).toContain('TRIGGER:-P1D');
    });

    it('adds 3-day reminder when enabled', () => {
      const options: ExportOptions = {
        ...defaultOptions,
        reminders: { ...defaultOptions.reminders, threeDays: true },
      };
      const result = generateICS(mockProjectData, options);

      expect(result).toContain('TRIGGER:-P3D');
    });

    it('adds 1-week reminder when enabled', () => {
      const options: ExportOptions = {
        ...defaultOptions,
        reminders: { ...defaultOptions.reminders, oneWeek: true },
      };
      const result = generateICS(mockProjectData, options);

      expect(result).toContain('TRIGGER:-P7D');
    });

    it('adds multiple reminders when multiple are enabled', () => {
      const options: ExportOptions = {
        ...defaultOptions,
        reminders: {
          oneHour: true,
          oneDay: true,
          threeDays: true,
          oneWeek: true,
        },
      };
      const result = generateICS(mockProjectData, options);

      expect(result).toContain('TRIGGER:-PT1H');
      expect(result).toContain('TRIGGER:-P1D');
      expect(result).toContain('TRIGGER:-P3D');
      expect(result).toContain('TRIGGER:-P7D');
    });

    it('includes bid bond info in internal event description', () => {
      const options: ExportOptions = { ...defaultOptions, includeInternal: true };
      const result = generateICS(mockProjectData, options);

      expect(result).toContain('10%');
    });

    it('includes project description in events', () => {
      const result = generateICS(mockProjectData, defaultOptions);
      expect(result).toContain('Complete renovation of historic building');
    });

    it('includes location in events', () => {
      const result = generateICS(mockProjectData, defaultOptions);
      expect(result).toContain('LOCATION:100 Main Street, Anytown, USA');
    });

    it('handles missing optional dates gracefully', () => {
      const minimalData: FullProjectData = {
        projectName: 'Test Project',
        agencyName: 'Test Agency',
        projectAddress: '',
        bidDueDate: '2025-01-15T17:00:00.000Z',
        rfiDueDate: null,
        siteVisitDate: null,
        isSiteVisitMandatory: false,
        rsvpDeadline: null,
        bidBondRequirement: null,
        bondRequestDeadline: null,
        finalizeRfiDeadline: null,
        finalizeBidPackageDeadline: null,
      };

      const result = generateICS(minimalData, defaultOptions);

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('[BID DUE] Test Project');
      expect(result).toContain('END:VCALENDAR');
      // Should not throw, should not include events for null dates
    });

    it('handles comments in project data', () => {
      const dataWithComments: FullProjectData = {
        ...mockProjectData,
        comments: 'Important: Check parking requirements',
      };

      const result = generateICS(dataWithComments, defaultOptions);
      expect(result).toContain('Important: Check parking requirements');
    });

    it('generates unique UIDs for events', () => {
      const result = generateICS(mockProjectData, defaultOptions);

      const uidMatches = result.match(/UID:[^\r\n]+/g);
      expect(uidMatches).not.toBeNull();
      expect(uidMatches!.length).toBeGreaterThan(0);

      // Check UIDs are unique
      const uniqueUids = new Set(uidMatches);
      expect(uniqueUids.size).toBe(uidMatches!.length);
    });

    it('uses CRLF line endings per ICS spec', () => {
      const result = generateICS(mockProjectData, defaultOptions);
      expect(result).toContain('\r\n');
    });
  });
});
