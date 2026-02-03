import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { useAppStore } from './store/useAppStore';

// Mock the gemini service
vi.mock('./services/gemini', () => ({
  extractBidInfo: vi.fn(),
  askAssistant: vi.fn(),
  summarizeConversation: vi.fn(),
  classifyError: vi.fn((err) => ({
    type: 'unknown',
    message: 'Test error',
    details: 'Test error details',
    retryable: true,
  })),
  getCustomApiKey: vi.fn(() => null),
  setCustomApiKey: vi.fn(),
  hasCustomApiKey: vi.fn(() => false),
  MODEL_INFO: {
    name: 'gemini-2.0-flash',
    limits: {
      requestsPerMinute: 15,
      tokensPerMinute: 1_000_000,
      requestsPerDay: 1500,
    },
  },
}));

// Mock the calendar utilities - we test these separately
vi.mock('./utils/calendar', () => ({
  calculateInternalEvents: vi.fn((data) => ({
    ...data,
    bondRequestDeadline: '2025-01-10T17:00:00.000Z',
    finalizeBidPackageDeadline: '2025-01-14T17:00:00.000Z',
    finalizeRfiDeadline: '2025-01-09T17:00:00.000Z',
    subcontractorBidDeadline: '2025-01-08T17:00:00.000Z',
    scopeReviewDeadline: '2025-01-05T17:00:00.000Z',
    addendumCheckDeadline: '2025-01-12T17:00:00.000Z',
  })),
  generateICS: vi.fn(() => 'mock-ics-content'),
  getBondDeadline: vi.fn(() => '2025-01-10T17:00:00.000Z'),
  getFinalizeBidDeadline: vi.fn(() => '2025-01-14T17:00:00.000Z'),
  getFinalizeRfiDeadline: vi.fn(() => '2025-01-09T17:00:00.000Z'),
  getSubcontractorBidDeadline: vi.fn(() => '2025-01-08T17:00:00.000Z'),
  getScopeReviewDeadline: vi.fn(() => '2025-01-05T17:00:00.000Z'),
  getAddendumCheckDeadline: vi.fn(() => '2025-01-12T17:00:00.000Z'),
  generateGoogleCalendarUrl: vi.fn(() => 'https://calendar.google.com/mock'),
  generateOutlookCalendarUrl: vi.fn(() => 'https://outlook.office.com/mock'),
  getMilestones: vi.fn(() => []),
}));

// Reset Zustand store before each test
beforeEach(() => {
  const store = useAppStore.getState();
  store.reset();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App Component', () => {
  describe('Initial Render', () => {
    it('renders the app header', () => {
      render(<App />);
      expect(screen.getByText('BidCalendar AI')).toBeInTheDocument();
    });

    it('shows file upload area on initial load', () => {
      render(<App />);
      expect(screen.getByText('Drop your bid documents')).toBeInTheDocument();
      expect(screen.getByText(/Supports PDF and high-res images/)).toBeInTheDocument();
    });

    it('has a file input accepting PDF and images', () => {
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.pdf,image/*');
    });

    it('does not show error message on initial load', () => {
      render(<App />);
      expect(screen.queryByText('Network connection failed')).not.toBeInTheDocument();
    });

    it('does not show review UI on initial load', () => {
      render(<App />);
      expect(screen.queryByText('Project Extracted Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Download ICS')).not.toBeInTheDocument();
    });

    it('does not show AI assistant sidebar on initial load', () => {
      render(<App />);
      expect(screen.queryByText('Bid AI Assistant')).not.toBeInTheDocument();
    });

    it('does not show progress bar on initial load', () => {
      render(<App />);
      expect(screen.queryByText('Uploading file...')).not.toBeInTheDocument();
      expect(screen.queryByText('Deep Thinking Analysis...')).not.toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('renders without crashing', () => {
      expect(() => render(<App />)).not.toThrow();
    });

    it('has proper upload instructions', () => {
      render(<App />);
      expect(screen.getByText('Drop your bid documents')).toBeInTheDocument();
      expect(screen.getByText(/Supports PDF and high-res images of RFPs or ITBs/)).toBeInTheDocument();
    });

    it('file input is hidden', () => {
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.style.display).toBe('none');
    });

    it('shows manual entry button', () => {
      render(<App />);
      expect(screen.getByText('Enter manually instead')).toBeInTheDocument();
    });

    it('shows settings button', () => {
      render(<App />);
      const settingsBtn = screen.getByTitle('Settings');
      expect(settingsBtn).toBeInTheDocument();
    });

    it('shows theme toggle button', () => {
      render(<App />);
      const themeBtn = screen.getByTitle(/Theme:/);
      expect(themeBtn).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('cycles theme when button clicked', async () => {
      render(<App />);
      const themeBtn = screen.getByTitle(/Theme:/);

      // Default is 'system', clicking should cycle to 'light'
      await act(async () => {
        fireEvent.click(themeBtn);
      });

      expect(useAppStore.getState().theme).toBe('light');
    });
  });

  describe('Manual Entry', () => {
    it('shows manual entry form when button clicked', async () => {
      render(<App />);
      const manualBtn = screen.getByText('Enter manually instead');

      await act(async () => {
        fireEvent.click(manualBtn);
      });

      expect(screen.getByText('Manual Bid Entry')).toBeInTheDocument();
      expect(screen.getByText(/Project Name/)).toBeInTheDocument();
    });

    it('can go back from manual entry', async () => {
      render(<App />);
      const manualBtn = screen.getByText('Enter manually instead');

      await act(async () => {
        fireEvent.click(manualBtn);
      });

      const backBtn = screen.getByText('Back to upload');
      await act(async () => {
        fireEvent.click(backBtn);
      });

      expect(screen.getByText('Drop your bid documents')).toBeInTheDocument();
    });
  });

  describe('Settings Modal', () => {
    it('opens settings modal when button clicked', async () => {
      render(<App />);
      const settingsBtn = screen.getByTitle('Settings');

      await act(async () => {
        fireEvent.click(settingsBtn);
      });

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Internal Milestone Lead Times')).toBeInTheDocument();
    });

    it('can change lead time settings', async () => {
      render(<App />);
      const settingsBtn = screen.getByTitle('Settings');

      await act(async () => {
        fireEvent.click(settingsBtn);
      });

      // Find bond request days input (should be first number input with value 5)
      const bondInput = screen.getAllByRole('spinbutton')[0];
      expect(bondInput).toHaveValue(5);

      await act(async () => {
        fireEvent.change(bondInput, { target: { value: '7' } });
      });

      expect(useAppStore.getState().leadTimeSettings.bondRequestDays).toBe(7);
    });
  });
});

// Integration tests for file operations and state management
describe('App Component Integration', () => {
  it('shows progress bar during processing state', async () => {
    // Set status to processing via store
    await act(async () => {
      useAppStore.getState().setStatus('processing');
      useAppStore.getState().setProgress(50);
    });

    render(<App />);
    expect(screen.getByText('Deep Thinking Analysis...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays extracted data in review state', async () => {
    const mockData = {
      projectName: 'Test Project',
      agencyName: 'Test Agency',
      projectAddress: '123 Test St',
      bidDueDate: '2025-01-15T17:00:00.000Z',
      rfiDueDate: '2025-01-10T17:00:00.000Z',
      siteVisitDate: null,
      isSiteVisitMandatory: false,
      rsvpDeadline: null,
      bidBondRequirement: '5%',
      bondRequestDeadline: '2025-01-10T17:00:00.000Z',
      finalizeBidPackageDeadline: '2025-01-14T17:00:00.000Z',
      finalizeRfiDeadline: '2025-01-09T17:00:00.000Z',
      subcontractorBidDeadline: '2025-01-08T17:00:00.000Z',
      scopeReviewDeadline: '2025-01-05T17:00:00.000Z',
      addendumCheckDeadline: '2025-01-12T17:00:00.000Z',
    };

    await act(async () => {
      useAppStore.getState().setData(mockData);
      useAppStore.getState().setStatus('review');
      useAppStore.getState().setFile({
        fileBase64: 'test',
        fileType: 'application/pdf',
        fileName: 'test.pdf',
      });
    });

    render(<App />);
    expect(screen.getByText('Project Extracted Data')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Agency')).toBeInTheDocument();
  });

  it('allows editing project fields in review state', async () => {
    const mockData = {
      projectName: 'Original Name',
      agencyName: 'Test Agency',
      projectAddress: '',
      bidDueDate: null,
      rfiDueDate: null,
      siteVisitDate: null,
      isSiteVisitMandatory: false,
      rsvpDeadline: null,
      bidBondRequirement: null,
      bondRequestDeadline: null,
      finalizeBidPackageDeadline: null,
      finalizeRfiDeadline: null,
      subcontractorBidDeadline: null,
      scopeReviewDeadline: null,
      addendumCheckDeadline: null,
    };

    await act(async () => {
      useAppStore.getState().setData(mockData);
      useAppStore.getState().setStatus('review');
      useAppStore.getState().setFile({
        fileBase64: 'test',
        fileType: 'application/pdf',
        fileName: 'test.pdf',
      });
    });

    render(<App />);

    const nameInput = screen.getByDisplayValue('Original Name');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    });

    expect(useAppStore.getState().data?.projectName).toBe('Updated Name');
  });

  it('toggles reminder settings', async () => {
    const mockData = {
      projectName: 'Test',
      agencyName: 'Test',
      projectAddress: '',
      bidDueDate: '2025-01-15T17:00:00.000Z',
      rfiDueDate: null,
      siteVisitDate: null,
      isSiteVisitMandatory: false,
      rsvpDeadline: null,
      bidBondRequirement: null,
      bondRequestDeadline: null,
      finalizeBidPackageDeadline: null,
      finalizeRfiDeadline: null,
      subcontractorBidDeadline: null,
      scopeReviewDeadline: null,
      addendumCheckDeadline: null,
    };

    await act(async () => {
      useAppStore.getState().setData(mockData);
      useAppStore.getState().setStatus('review');
      useAppStore.getState().setFile({
        fileBase64: 'test',
        fileType: 'application/pdf',
        fileName: 'test.pdf',
      });
    });

    render(<App />);

    // Find the 3 Days checkbox (initially unchecked)
    const threeDaysCheckbox = screen.getByLabelText('3 Days');
    expect(threeDaysCheckbox).not.toBeChecked();

    await act(async () => {
      fireEvent.click(threeDaysCheckbox);
    });

    expect(useAppStore.getState().exportOptions.reminders.threeDays).toBe(true);
  });

  it('opens batch sync modal', async () => {
    const mockData = {
      projectName: 'Test',
      agencyName: 'Test',
      projectAddress: '',
      bidDueDate: '2025-01-15T17:00:00.000Z',
      rfiDueDate: null,
      siteVisitDate: null,
      isSiteVisitMandatory: false,
      rsvpDeadline: null,
      bidBondRequirement: null,
      bondRequestDeadline: null,
      finalizeBidPackageDeadline: null,
      finalizeRfiDeadline: null,
      subcontractorBidDeadline: null,
      scopeReviewDeadline: null,
      addendumCheckDeadline: null,
    };

    await act(async () => {
      useAppStore.getState().setData(mockData);
      useAppStore.getState().setStatus('review');
      useAppStore.getState().setFile({
        fileBase64: 'test',
        fileType: 'application/pdf',
        fileName: 'test.pdf',
      });
    });

    render(<App />);

    const syncBtn = screen.getByText('Sync to Calendar');
    await act(async () => {
      fireEvent.click(syncBtn);
    });

    expect(screen.getByText('Batch Calendar Sync')).toBeInTheDocument();
  });

  it('shows chat sidebar with suggested questions', async () => {
    const mockData = {
      projectName: 'Test',
      agencyName: 'Test',
      projectAddress: '',
      bidDueDate: '2025-01-15T17:00:00.000Z',
      rfiDueDate: null,
      siteVisitDate: null,
      isSiteVisitMandatory: false,
      rsvpDeadline: null,
      bidBondRequirement: null,
      bondRequestDeadline: null,
      finalizeBidPackageDeadline: null,
      finalizeRfiDeadline: null,
      subcontractorBidDeadline: null,
      scopeReviewDeadline: null,
      addendumCheckDeadline: null,
    };

    await act(async () => {
      useAppStore.getState().setData(mockData);
      useAppStore.getState().setStatus('review');
      useAppStore.getState().setFile({
        fileBase64: 'test',
        fileType: 'application/pdf',
        fileName: 'test.pdf',
      });
    });

    render(<App />);

    expect(screen.getByText('Bid AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Suggested questions:')).toBeInTheDocument();
    expect(screen.getByText('What are the liquidated damages?')).toBeInTheDocument();
  });
});
