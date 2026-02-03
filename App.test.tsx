import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the gemini service
vi.mock('./services/gemini', () => ({
  extractBidInfo: vi.fn(),
  askAssistant: vi.fn(),
  summarizeConversation: vi.fn(),
}));

// Mock the calendar utilities - we test these separately
vi.mock('./utils/calendar', () => ({
  calculateInternalEvents: vi.fn((data) => ({
    ...data,
    bondRequestDeadline: '2025-01-10T17:00:00.000Z',
    finalizeBidPackageDeadline: '2025-01-14T17:00:00.000Z',
    finalizeRfiDeadline: '2025-01-09T17:00:00.000Z',
  })),
  generateICS: vi.fn(() => 'mock-ics-content'),
  getBondDeadline: vi.fn(() => '2025-01-10T17:00:00.000Z'),
  getFinalizeBidDeadline: vi.fn(() => '2025-01-14T17:00:00.000Z'),
  getFinalizeRfiDeadline: vi.fn(() => '2025-01-09T17:00:00.000Z'),
  generateGoogleCalendarUrl: vi.fn(() => 'https://calendar.google.com/mock'),
  generateOutlookCalendarUrl: vi.fn(() => 'https://outlook.office.com/mock'),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
      expect(screen.queryByText('Extraction Error')).not.toBeInTheDocument();
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

    it('file input is hidden but clickable', () => {
      render(<App />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.style.opacity).toBe('0');
      expect(fileInput.style.cursor).toBe('pointer');
    });
  });
});

// These tests verify the business logic helper functions that are pure and testable
// The complex FileReader-based flow tests are covered by integration testing
describe('App Component Integration (requires mock file operations)', () => {
  it.todo('should show progress bar during file upload');
  it.todo('should display extracted data in review state');
  it.todo('should allow editing project fields');
  it.todo('should toggle reminder settings');
  it.todo('should open batch sync modal');
  it.todo('should send chat messages to AI assistant');
  it.todo('should export ICS file when button clicked');
});
