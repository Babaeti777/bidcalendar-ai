import { FullProjectData, ExportOptions, LeadTimeSettings, DEFAULT_LEAD_TIMES } from "../types";

const ONE_DAY = 24 * 60 * 60 * 1000;

// Generic deadline calculator
export function getDeadlineBefore(dateStr: string | null, daysBefore: number): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() - (daysBefore * ONE_DAY)).toISOString();
}

// Legacy functions for backward compatibility
export function getBondDeadline(bidDateStr: string | null, daysBefore: number = 5): string | null {
  return getDeadlineBefore(bidDateStr, daysBefore);
}

export function getFinalizeBidDeadline(bidDateStr: string | null, daysBefore: number = 1): string | null {
  return getDeadlineBefore(bidDateStr, daysBefore);
}

export function getFinalizeRfiDeadline(rfiDateStr: string | null, daysBefore: number = 1): string | null {
  return getDeadlineBefore(rfiDateStr, daysBefore);
}

// New milestone functions
export function getSubcontractorBidDeadline(bidDateStr: string | null, daysBefore: number = 7): string | null {
  return getDeadlineBefore(bidDateStr, daysBefore);
}

export function getScopeReviewDeadline(bidDateStr: string | null, daysBefore: number = 10): string | null {
  return getDeadlineBefore(bidDateStr, daysBefore);
}

export function getAddendumCheckDeadline(bidDateStr: string | null, daysBefore: number = 3): string | null {
  return getDeadlineBefore(bidDateStr, daysBefore);
}

export function calculateInternalEvents(
  data: Partial<FullProjectData>,
  settings: LeadTimeSettings = DEFAULT_LEAD_TIMES
): Partial<FullProjectData> {
  return {
    ...data,
    bidBondRequirement: data.bidBondRequirement || null,
    // Existing milestones
    bondRequestDeadline: getBondDeadline(data.bidDueDate || null, settings.bondRequestDays),
    finalizeBidPackageDeadline: getFinalizeBidDeadline(data.bidDueDate || null, settings.finalizeBidDays),
    finalizeRfiDeadline: getFinalizeRfiDeadline(data.rfiDueDate || null, settings.finalizeRfiDays),
    // New milestones
    subcontractorBidDeadline: getSubcontractorBidDeadline(data.bidDueDate || null, settings.subcontractorBidDays),
    scopeReviewDeadline: getScopeReviewDeadline(data.bidDueDate || null, settings.scopeReviewDays),
    addendumCheckDeadline: getAddendumCheckDeadline(data.bidDueDate || null, settings.addendumCheckDays),
  };
}

/**
 * Generates a Google Calendar Template URL
 */
export function generateGoogleCalendarUrl(summary: string, dateStr: string | null, description: string, location: string = ""): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const start = d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const endD = new Date(d);
  endD.setHours(endD.getHours() + 1);
  const end = endD.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summary,
    dates: `${start}/${end}`,
    details: description,
    location: location,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an Outlook Web Calendar URL
 */
export function generateOutlookCalendarUrl(summary: string, dateStr: string | null, description: string, location: string = ""): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const start = d.toISOString();
  const endD = new Date(d);
  endD.setHours(endD.getHours() + 1);
  const end = endD.toISOString();

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: summary,
    startdt: start,
    enddt: end,
    body: description,
    location: location,
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function generateICS(data: FullProjectData, options: ExportOptions): string {
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BidCalendarAI//Construction//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const addEvent = (summary: string, dateStr: string | null, description: string, location: string = "") => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;

    try {
        const dtStart = formatDate(dateStr);
        if (!dtStart) return;

        d.setHours(d.getHours() + 1);
        const dtEnd = formatDate(d.toISOString());

        const now = formatDate(new Date().toISOString());

        icsContent.push("BEGIN:VEVENT");
        icsContent.push(`UID:${now}-${Math.random().toString(36).substr(2, 9)}@bidcalendar.ai`);
        icsContent.push(`DTSTAMP:${now}`);
        icsContent.push(`DTSTART:${dtStart}`);
        icsContent.push(`DTEND:${dtEnd}`);
        icsContent.push(`SUMMARY:${summary}`);
        if (description) icsContent.push(`DESCRIPTION:${description}`);
        if (location) icsContent.push(`LOCATION:${location}`);

        // Dynamic Reminders
        if (options.reminders.oneHour) {
          icsContent.push("BEGIN:VALARM");
          icsContent.push("ACTION:DISPLAY");
          icsContent.push(`DESCRIPTION:Reminder: ${summary} (1 Hour)`);
          icsContent.push("TRIGGER:-PT1H");
          icsContent.push("END:VALARM");
        }
        if (options.reminders.oneDay) {
          icsContent.push("BEGIN:VALARM");
          icsContent.push("ACTION:DISPLAY");
          icsContent.push(`DESCRIPTION:Reminder: ${summary} (1 Day)`);
          icsContent.push("TRIGGER:-P1D");
          icsContent.push("END:VALARM");
        }
        if (options.reminders.threeDays) {
          icsContent.push("BEGIN:VALARM");
          icsContent.push("ACTION:DISPLAY");
          icsContent.push(`DESCRIPTION:Reminder: ${summary} (3 Days)`);
          icsContent.push("TRIGGER:-P3D");
          icsContent.push("END:VALARM");
        }
        if (options.reminders.oneWeek) {
          icsContent.push("BEGIN:VALARM");
          icsContent.push("ACTION:DISPLAY");
          icsContent.push(`DESCRIPTION:Reminder: ${summary} (1 Week)`);
          icsContent.push("TRIGGER:-P7D");
          icsContent.push("END:VALARM");
        }

        icsContent.push("END:VEVENT");
    } catch (e) {
        console.error("Error creating event for", summary, e);
    }
  };

  const { projectName, agencyName, projectAddress, comments, bidBondRequirement, projectDescription } = data;
  const footer = `\\n\\n--- Generated by BidCalendar AI ---`;
  const noteSection = comments ? `\\n\\nUser Notes:\\n${comments.replace(/\n/g, "\\n")}` : "";
  const descSection = projectDescription ? `\\nScope: ${projectDescription.replace(/\n/g, "\\n")}` : "";
  const bondInfo = bidBondRequirement ? `\\nBid Bond Required: ${bidBondRequirement}` : "";
  const baseInfo = `Project: ${projectName}\\nAgency: ${agencyName}${projectAddress ? `\\nSite Location: ${projectAddress}` : ""}${descSection}${bondInfo}${noteSection}`;

  // External Events (Always included)
  addEvent(
    `[BID DUE] ${projectName}`,
    data.bidDueDate,
    `CRITICAL DEADLINE: Official bid submission deadline for ${projectName}.\\n\\nAgency: ${agencyName}\\n${baseInfo}${footer}`,
    projectAddress
  );

  addEvent(
    `[RFI DUE] ${projectName}`,
    data.rfiDueDate,
    `Deadline to submit all Requests for Information (RFIs) to ${agencyName} for ${projectName}.\\n\\n${baseInfo}${footer}`,
    projectAddress
  );

  const siteVisitTitle = `[${data.isSiteVisitMandatory ? "MANDATORY " : ""}SITE VISIT] ${projectName}`;
  addEvent(
    siteVisitTitle,
    data.siteVisitDate,
    `${data.isSiteVisitMandatory ? "REQUIRED: " : ""}Site visit and pre-bid conference for ${projectName}.\\n\\n${baseInfo}${footer}`,
    projectAddress
  );

  addEvent(
    `[RSVP] Site Visit: ${projectName}`,
    data.rsvpDeadline,
    `Deadline to notify ${agencyName} of your intent to attend the site visit for ${projectName}.\\n\\n${baseInfo}${footer}`,
    projectAddress
  );

  // Internal Milestones (Optional)
  if (options.includeInternal) {
    const bondDesc = bidBondRequirement
      ? `Internal Milestone: Submit bid bond request (${bidBondRequirement}) to your surety agent for ${projectName}.`
      : `Internal Milestone: Submit bid bond request to your surety agent for ${projectName}.`;

    addEvent(
      `[INTERNAL] Bond Request: ${projectName}`,
      data.bondRequestDeadline,
      `${bondDesc}\\n\\nThis deadline is set before the bid is due to ${agencyName}.\\n\\n${baseInfo}${footer}`
    );

    addEvent(
      `[INTERNAL] Finalize RFI List: ${projectName}`,
      data.finalizeRfiDeadline,
      `Internal Milestone: Finalize all technical questions for ${projectName} to ensure submission by the ${agencyName} RFI deadline.\\n\\n${baseInfo}${footer}`
    );

    addEvent(
      `[INTERNAL] Final Bid Package Prep: ${projectName}`,
      data.finalizeBidPackageDeadline,
      `Internal Milestone: Complete all estimate reviews and final documentation for the ${projectName} bid package.\\n\\n${baseInfo}${footer}`
    );

    // New internal milestones
    addEvent(
      `[INTERNAL] Subcontractor Bids Due: ${projectName}`,
      data.subcontractorBidDeadline,
      `Internal Milestone: Deadline for subcontractor pricing submissions for ${projectName}.\\n\\nEnsure all trades have submitted their numbers.\\n\\n${baseInfo}${footer}`
    );

    addEvent(
      `[INTERNAL] Scope Review: ${projectName}`,
      data.scopeReviewDeadline,
      `Internal Milestone: Complete detailed scope review and takeoffs for ${projectName}.\\n\\nVerify quantities and identify any gaps.\\n\\n${baseInfo}${footer}`
    );

    addEvent(
      `[INTERNAL] Addendum Check: ${projectName}`,
      data.addendumCheckDeadline,
      `Internal Milestone: Final addendum review for ${projectName}.\\n\\nEnsure all addenda are incorporated into your bid.\\n\\n${baseInfo}${footer}`
    );
  }

  icsContent.push("END:VCALENDAR");
  return icsContent.join("\r\n");
}

// Get all milestones for display
export function getMilestones(data: FullProjectData, includeInternal: boolean) {
  const list = [
    { label: 'Bid Due', date: data.bidDueDate, color: '#dc2626', type: 'external' },
    { label: 'RFI Due', date: data.rfiDueDate, color: '#2563eb', type: 'external' },
    { label: 'Site Visit', date: data.siteVisitDate, color: '#d97706', type: 'external' },
    { label: 'RSVP Deadline', date: data.rsvpDeadline, color: '#4f46e5', type: 'external' },
  ];

  if (includeInternal) {
    if (data.scopeReviewDeadline) list.push({ label: 'Scope Review', date: data.scopeReviewDeadline, color: '#0891b2', type: 'internal' });
    if (data.subcontractorBidDeadline) list.push({ label: 'Sub Bids Due', date: data.subcontractorBidDeadline, color: '#7c3aed', type: 'internal' });
    if (data.bondRequestDeadline) list.push({ label: 'Bond Request', date: data.bondRequestDeadline, color: '#9333ea', type: 'internal' });
    if (data.addendumCheckDeadline) list.push({ label: 'Addendum Check', date: data.addendumCheckDeadline, color: '#059669', type: 'internal' });
    if (data.finalizeRfiDeadline) list.push({ label: 'Finalize RFIs', date: data.finalizeRfiDeadline, color: '#4b5563', type: 'internal' });
    if (data.finalizeBidPackageDeadline) list.push({ label: 'Final Prep', date: data.finalizeBidPackageDeadline, color: '#4b5563', type: 'internal' });
  }

  return list.filter(m => m.date).sort((a, b) => {
    const dateA = new Date(a.date!).getTime();
    const dateB = new Date(b.date!).getTime();
    return dateA - dateB;
  });
}
