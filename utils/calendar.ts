
import { FullProjectData, ExportOptions } from "../types";

const ONE_DAY = 24 * 60 * 60 * 1000;

export function getBondDeadline(bidDateStr: string | null): string | null {
  if (!bidDateStr) return null;
  const d = new Date(bidDateStr);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() - (5 * ONE_DAY)).toISOString();
}

export function getFinalizeBidDeadline(bidDateStr: string | null): string | null {
  if (!bidDateStr) return null;
  const d = new Date(bidDateStr);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() - (1 * ONE_DAY)).toISOString();
}

export function getFinalizeRfiDeadline(rfiDateStr: string | null): string | null {
  if (!rfiDateStr) return null;
  const d = new Date(rfiDateStr);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() - (1 * ONE_DAY)).toISOString();
}

export function calculateInternalEvents(data: Partial<FullProjectData>): Partial<FullProjectData> {
  return {
    ...data,
    bidBondRequirement: data.bidBondRequirement || null,
    bondRequestDeadline: getBondDeadline(data.bidDueDate || null),
    finalizeBidPackageDeadline: getFinalizeBidDeadline(data.bidDueDate || null),
    finalizeRfiDeadline: getFinalizeRfiDeadline(data.rfiDueDate || null)
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
      `${bondDesc}\\n\\nThis deadline is set for 5 days before the bid is due to ${agencyName}.\\n\\n${baseInfo}${footer}`
    );
    
    addEvent(
      `[INTERNAL] Finalize RFI List: ${projectName}`, 
      data.finalizeRfiDeadline, 
      `Internal Milestone: Finalize all technical questions for ${projectName} to ensure submission by the ${agencyName} RFI deadline.\\n\\n${baseInfo}${footer}`
    );
    
    addEvent(
      `[INTERNAL] Final Bid Package Prep: ${projectName}`, 
      data.finalizeBidPackageDeadline, 
      `Internal Milestone: Complete all estimate reviews and final documentation for the ${projectName} bid package.\\n\\nPlan to have everything ready at least 24 hours before the ${agencyName} deadline.\\n\\n${baseInfo}${footer}`
    );
  }

  icsContent.push("END:VCALENDAR");
  return icsContent.join("\r\n");
}
