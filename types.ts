
export interface ExtractedBidData {
  projectName: string;
  agencyName: string;
  projectAddress: string;
  projectDescription?: string;
  bidDueDate: string | null; // ISO Date String
  rfiDueDate: string | null; // ISO Date String
  siteVisitDate: string | null; // ISO Date String
  isSiteVisitMandatory: boolean;
  rsvpDeadline: string | null; // ISO Date String
  bidBondRequirement: string | null;
  comments?: string;
}

export interface InternalEvents {
  bondRequestDeadline: string | null;
  finalizeRfiDeadline: string | null;
  finalizeBidPackageDeadline: string | null;
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

export interface FullProjectData extends ExtractedBidData, InternalEvents {}

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'review' | 'error';
