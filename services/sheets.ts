import { FullProjectData } from '../types';

// Google Sheets API configuration
// Users need to set up a Google Cloud project and create credentials
// See: https://developers.google.com/sheets/api/quickstart/js

interface SheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  apiKey?: string;
}

// Default sheet headers
const SHEET_HEADERS = [
  'Date Added',
  'Project Name',
  'Agency',
  'Project Address',
  'Bid Due Date',
  'RFI Due Date',
  'Site Visit Date',
  'Site Visit Mandatory',
  'RSVP Deadline',
  'Bid Bond',
  'Description',
  'Notes',
];

// Format date for spreadsheet
function formatDateForSheet(isoDate: string | null): string {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// Convert project data to row format
function projectToRow(data: FullProjectData): string[] {
  return [
    new Date().toISOString(),
    data.projectName || '',
    data.agencyName || '',
    data.projectAddress || '',
    formatDateForSheet(data.bidDueDate),
    formatDateForSheet(data.rfiDueDate),
    formatDateForSheet(data.siteVisitDate),
    data.isSiteVisitMandatory ? 'Yes' : 'No',
    formatDateForSheet(data.rsvpDeadline),
    data.bidBondRequirement || '',
    data.projectDescription || '',
    data.comments || '',
  ];
}

// Load Google Sheets API
let gapiLoaded = false;
let gapiInitialized = false;

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

async function initializeGapi(apiKey: string, clientId: string): Promise<void> {
  if (gapiInitialized) return;

  await loadGapiScript();

  return new Promise((resolve, reject) => {
    (window as any).gapi.load('client:auth2', async () => {
      try {
        await (window as any).gapi.client.init({
          apiKey: apiKey,
          clientId: clientId,
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          scope: 'https://www.googleapis.com/auth/spreadsheets',
        });
        gapiInitialized = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Check if user is signed in
export function isSignedIn(): boolean {
  if (!gapiInitialized) return false;
  return (window as any).gapi.auth2.getAuthInstance().isSignedIn.get();
}

// Sign in to Google
export async function signIn(): Promise<void> {
  if (!gapiInitialized) {
    throw new Error('Google API not initialized. Call initializeGoogleSheets first.');
  }
  await (window as any).gapi.auth2.getAuthInstance().signIn();
}

// Sign out from Google
export async function signOut(): Promise<void> {
  if (!gapiInitialized) return;
  await (window as any).gapi.auth2.getAuthInstance().signOut();
}

// Initialize Google Sheets integration
export async function initializeGoogleSheets(apiKey: string, clientId: string): Promise<void> {
  await initializeGapi(apiKey, clientId);
}

// Append project data to Google Sheet
export async function appendToSheet(
  spreadsheetId: string,
  data: FullProjectData,
  sheetName: string = 'BidCalendar'
): Promise<{ success: boolean; error?: string }> {
  if (!gapiInitialized) {
    return { success: false, error: 'Google API not initialized' };
  }

  if (!isSignedIn()) {
    return { success: false, error: 'Not signed in to Google' };
  }

  try {
    const row = projectToRow(data);

    const response = await (window as any).gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A:L`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [row],
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error appending to sheet:', error);
    return {
      success: false,
      error: error.message || 'Failed to append to Google Sheet',
    };
  }
}

// Create a new spreadsheet for bid tracking
export async function createBidTrackerSheet(): Promise<{
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  error?: string;
}> {
  if (!gapiInitialized) {
    return { success: false, error: 'Google API not initialized' };
  }

  if (!isSignedIn()) {
    return { success: false, error: 'Not signed in to Google' };
  }

  try {
    // Create the spreadsheet
    const createResponse = await (window as any).gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: 'BidCalendar AI - Bid Tracker',
        },
        sheets: [
          {
            properties: {
              title: 'BidCalendar',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      },
    });

    const spreadsheetId = createResponse.result.spreadsheetId;

    // Add headers
    await (window as any).gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'BidCalendar!A1:L1',
      valueInputOption: 'RAW',
      resource: {
        values: [SHEET_HEADERS],
      },
    });

    // Format header row (bold, background color)
    await (window as any).gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.9 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 12,
              },
            },
          },
        ],
      },
    });

    return {
      success: true,
      spreadsheetId: spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  } catch (error: any) {
    console.error('Error creating spreadsheet:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Google Sheet',
    };
  }
}

// Get list of recent spreadsheets (for selection)
export async function listSpreadsheets(): Promise<{
  success: boolean;
  spreadsheets?: { id: string; name: string }[];
  error?: string;
}> {
  if (!gapiInitialized) {
    return { success: false, error: 'Google API not initialized' };
  }

  if (!isSignedIn()) {
    return { success: false, error: 'Not signed in to Google' };
  }

  try {
    // Note: This requires Drive API scope
    // For simplicity, we'll just return an empty list and let users paste spreadsheet ID
    return {
      success: true,
      spreadsheets: [],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to list spreadsheets',
    };
  }
}

// Export configuration helpers
export const SHEETS_CONFIG_KEY = 'bidcalendar-sheets-config';

export function getSavedSheetsConfig(): SheetsConfig | null {
  try {
    const saved = localStorage.getItem(SHEETS_CONFIG_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveSheetsConfig(config: SheetsConfig): void {
  localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(config));
}

export function clearSheetsConfig(): void {
  localStorage.removeItem(SHEETS_CONFIG_KEY);
}
