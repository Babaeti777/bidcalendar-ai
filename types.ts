
export interface ExtractedBidData {
  projectName: string;
  agencyName: string;
  projectAddress: string;
  projectDescription?: string;
  bidDueDate: string | null;
  rfiDueDate: string | null;
  siteVisitDate: string | null;
  isSiteVisitMandatory: boolean;
  rsvpDeadline: string | null;
  bidBondRequirement: string | null;
  comments?: string;
}

export interface InternalEvents {
  bondRequestDeadline: string | null;
  finalizeRfiDeadline: string | null;
  finalizeBidPackageDeadline: string | null;
  // New milestones
  subcontractorBidDeadline: string | null;
  scopeReviewDeadline: string | null;
  addendumCheckDeadline: string | null;
}

export interface ExportOptions {
  includeInternal: boolean;
  reminders: {
    oneHour: boolean;
    oneDay: boolean;
    threeDays: boolean;
    oneWeek: boolean;
  };
}

// User-configurable lead times for internal milestones (in days)
export interface LeadTimeSettings {
  bondRequestDays: number;         // Default: 5 days before bid
  finalizeBidDays: number;         // Default: 1 day before bid
  finalizeRfiDays: number;         // Default: 1 day before RFI
  subcontractorBidDays: number;    // Default: 7 days before bid
  scopeReviewDays: number;         // Default: 10 days before bid
  addendumCheckDays: number;       // Default: 3 days before bid
}

export const DEFAULT_LEAD_TIMES: LeadTimeSettings = {
  bondRequestDays: 5,
  finalizeBidDays: 1,
  finalizeRfiDays: 1,
  subcontractorBidDays: 7,
  scopeReviewDays: 10,
  addendumCheckDays: 3,
};

export interface FullProjectData extends ExtractedBidData, InternalEvents {}

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'review' | 'error' | 'manual';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  thinking?: boolean;
}

export interface ConversationSummary {
  text: string;
  generatedAt: number;
}

// Suggested questions for chat
export const SUGGESTED_QUESTIONS = [
  "What are the liquidated damages?",
  "Is there a DBE/MBE requirement?",
  "What are the bonding requirements?",
  "Are there any addenda I should know about?",
  "What is the project duration?",
  "Are there any special insurance requirements?",
  "What are the payment terms?",
  "Is there a prequalification requirement?",
];

// Error types for detailed error messages
export type ErrorType =
  | 'network_error'
  | 'api_error'
  | 'invalid_document'
  | 'extraction_failed'
  | 'no_dates_found'
  | 'file_too_large'
  | 'unsupported_format'
  | 'rate_limit'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  retryable: boolean;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: 'upload' | 'extract' | 'edit' | 'export' | 'chat' | 'sync' | 'error';
  details: Record<string, unknown>;
  userId?: string;
}

// Theme
export type Theme = 'light' | 'dark' | 'system';

// Redaction settings
export interface RedactionSettings {
  enabled: boolean;
  patterns: string[];
}

export const DEFAULT_REDACTION_PATTERNS = [
  '\\$[\\d,]+(?:\\.\\d{2})?',  // Dollar amounts
  '\\d+%',                      // Percentages
  'bid bond.*?(?=\\.|$)',       // Bid bond mentions
];
