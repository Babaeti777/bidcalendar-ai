import { FullProjectData, ExportOptions } from '../types';

// Google Calendar API configuration
// Users need to set up a Google Cloud project with Calendar API enabled
// See: https://developers.google.com/calendar/api/quickstart/js

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: any = null;
let gapiInitialized = false;

// Callback for when auth is complete
let authCallback: ((success: boolean) => void) | null = null;

// Load the GAPI script
async function loadGapiScript(): Promise<void> {
  if (gapiLoaded) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapiLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google API script'));
    document.body.appendChild(script);
  });
}

// Load the GIS (Google Identity Services) script
async function loadGisScript(): Promise<void> {
  if (gisLoaded) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.body.appendChild(script);
  });
}

// Initialize GAPI client
async function initializeGapiClient(): Promise<void> {
  await (window as any).gapi.client.init({});
  await (window as any).gapi.client.load(DISCOVERY_DOC);
  gapiInitialized = true;
}

// Initialize Google Calendar API
export async function initializeGoogleCalendar(clientId: string): Promise<void> {
  await Promise.all([loadGapiScript(), loadGisScript()]);

  // Initialize GAPI
  await new Promise<void>((resolve) => {
    (window as any).gapi.load('client', async () => {
      await initializeGapiClient();
      resolve();
    });
  });

  // Initialize token client
  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response: any) => {
      if (response.error) {
        console.error('Auth error:', response.error);
        authCallback?.(false);
      } else {
        authCallback?.(true);
      }
    },
  });
}

// Check if user has valid token
export function hasValidToken(): boolean {
  const token = (window as any).gapi?.client?.getToken();
  return !!token;
}

// Request access token (prompts user consent)
export async function requestAccess(): Promise<boolean> {
  if (!tokenClient) {
    throw new Error('Google Calendar not initialized');
  }

  return new Promise((resolve) => {
    authCallback = resolve;

    if (hasValidToken()) {
      // Token exists, request with hint to skip consent if possible
      tokenClient.requestAccessToken({ prompt: '' });
    } else {
      // No token, show consent screen
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  });
}

// Revoke access
export function revokeAccess(): void {
  const token = (window as any).gapi?.client?.getToken();
  if (token) {
    (window as any).google.accounts.oauth2.revoke(token.access_token);
    (window as any).gapi.client.setToken(null);
  }
}

// Create a calendar event
interface CalendarEvent {
  summary: string;
  description: string;
  location?: string;
  start: string; // ISO date string
  end?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

async function createEvent(event: CalendarEvent): Promise<{ success: boolean; eventId?: string; error?: string }> {
  if (!gapiInitialized || !hasValidToken()) {
    return { success: false, error: 'Not authenticated' };
  }

  const startDate = new Date(event.start);
  const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default

  try {
    const response = await (window as any).gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: event.summary,
        description: event.description,
        location: event.location || '',
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: event.reminders || { useDefault: true },
      },
    });

    return { success: true, eventId: response.result.id };
  } catch (error: any) {
    console.error('Error creating event:', error);
    return { success: false, error: error.message || 'Failed to create event' };
  }
}

// Build reminder overrides from export options
function buildReminders(options: ExportOptions): { useDefault: boolean; overrides: { method: string; minutes: number }[] } {
  const overrides: { method: string; minutes: number }[] = [];

  if (options.reminders.oneHour) overrides.push({ method: 'popup', minutes: 60 });
  if (options.reminders.oneDay) overrides.push({ method: 'popup', minutes: 1440 });
  if (options.reminders.threeDays) overrides.push({ method: 'popup', minutes: 4320 });
  if (options.reminders.oneWeek) overrides.push({ method: 'popup', minutes: 10080 });

  return {
    useDefault: overrides.length === 0,
    overrides: overrides.length > 0 ? overrides : [],
  };
}

// Sync all project events to Google Calendar
export async function syncProjectToCalendar(
  data: FullProjectData,
  options: ExportOptions,
  onProgress?: (current: number, total: number, eventName: string) => void
): Promise<{ success: boolean; created: number; failed: number; errors: string[] }> {
  if (!gapiInitialized || !hasValidToken()) {
    return { success: false, created: 0, failed: 0, errors: ['Not authenticated'] };
  }

  const events: CalendarEvent[] = [];
  const reminders = buildReminders(options);

  const baseDescription = `Project: ${data.projectName}\nAgency: ${data.agencyName}${data.projectAddress ? `\nLocation: ${data.projectAddress}` : ''}${data.projectDescription ? `\nScope: ${data.projectDescription}` : ''}`;

  // External events
  if (data.bidDueDate) {
    events.push({
      summary: `[BID DUE] ${data.projectName}`,
      description: `CRITICAL DEADLINE: Official bid submission deadline.\n\n${baseDescription}`,
      location: data.projectAddress,
      start: data.bidDueDate,
      reminders,
    });
  }

  if (data.rfiDueDate) {
    events.push({
      summary: `[RFI DUE] ${data.projectName}`,
      description: `Deadline to submit all Requests for Information.\n\n${baseDescription}`,
      location: data.projectAddress,
      start: data.rfiDueDate,
      reminders,
    });
  }

  if (data.siteVisitDate) {
    events.push({
      summary: `[${data.isSiteVisitMandatory ? 'MANDATORY ' : ''}SITE VISIT] ${data.projectName}`,
      description: `${data.isSiteVisitMandatory ? 'REQUIRED: ' : ''}Site visit and pre-bid conference.\n\n${baseDescription}`,
      location: data.projectAddress,
      start: data.siteVisitDate,
      reminders,
    });
  }

  if (data.rsvpDeadline) {
    events.push({
      summary: `[RSVP] Site Visit: ${data.projectName}`,
      description: `Deadline to RSVP for site visit.\n\n${baseDescription}`,
      start: data.rsvpDeadline,
      reminders,
    });
  }

  // Internal events
  if (options.includeInternal) {
    if (data.scopeReviewDeadline) {
      events.push({
        summary: `[INTERNAL] Scope Review: ${data.projectName}`,
        description: `Internal milestone: Complete scope review and takeoffs.\n\n${baseDescription}`,
        start: data.scopeReviewDeadline,
        reminders,
      });
    }

    if (data.subcontractorBidDeadline) {
      events.push({
        summary: `[INTERNAL] Sub Bids Due: ${data.projectName}`,
        description: `Internal milestone: Subcontractor pricing due.\n\n${baseDescription}`,
        start: data.subcontractorBidDeadline,
        reminders,
      });
    }

    if (data.bondRequestDeadline) {
      events.push({
        summary: `[INTERNAL] Bond Request: ${data.projectName}`,
        description: `Internal milestone: Submit bid bond request to surety.${data.bidBondRequirement ? `\nBond: ${data.bidBondRequirement}` : ''}\n\n${baseDescription}`,
        start: data.bondRequestDeadline,
        reminders,
      });
    }

    if (data.addendumCheckDeadline) {
      events.push({
        summary: `[INTERNAL] Addendum Check: ${data.projectName}`,
        description: `Internal milestone: Final addendum review.\n\n${baseDescription}`,
        start: data.addendumCheckDeadline,
        reminders,
      });
    }

    if (data.finalizeRfiDeadline) {
      events.push({
        summary: `[INTERNAL] Finalize RFIs: ${data.projectName}`,
        description: `Internal milestone: Finalize all RFI questions.\n\n${baseDescription}`,
        start: data.finalizeRfiDeadline,
        reminders,
      });
    }

    if (data.finalizeBidPackageDeadline) {
      events.push({
        summary: `[INTERNAL] Final Prep: ${data.projectName}`,
        description: `Internal milestone: Complete final bid package preparation.\n\n${baseDescription}`,
        start: data.finalizeBidPackageDeadline,
        reminders,
      });
    }
  }

  let created = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    onProgress?.(i + 1, events.length, event.summary);

    const result = await createEvent(event);
    if (result.success) {
      created++;
    } else {
      failed++;
      errors.push(`${event.summary}: ${result.error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return {
    success: failed === 0,
    created,
    failed,
    errors,
  };
}

// Check if Google Calendar is available
export function isGoogleCalendarAvailable(): boolean {
  return gapiInitialized;
}
