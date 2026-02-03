import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedBidData, AppError, ErrorType, RedactionSettings } from "../types";

// Model configuration - using gemini-2.5-flash for good balance of quality and free tier limits
// gemini-2.5-flash: 10 RPM, 250K TPM, 250 RPD (free tier)
// gemini-2.5-flash-lite: 15 RPM, 250K TPM, 1000 RPD (free tier, lower quality)
// gemini-2.5-pro: 5 RPM, 250K TPM, 100 RPD (free tier, best quality)
// Note: gemini-2.0-flash is deprecated (shutdown March 31, 2026)
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Get API key - supports custom key from localStorage or env variable
function getApiKey(): string {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('gemini_api_key');
    if (customKey) return customKey;
  }
  return process.env.API_KEY || process.env.GEMINI_API_KEY || '';
}

// Configuration for extraction schema
const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING, description: "The name of the construction or procurement project." },
    agencyName: { type: Type.STRING, description: "The name of the agency, owner, or organization issuing the bid." },
    projectAddress: { type: Type.STRING, description: "The physical address of the project site." },
    projectDescription: { type: Type.STRING, description: "A brief description or scope of work for the project." },
    bidDueDate: { type: Type.STRING, description: "The date and time the bid is due in ISO 8601 format." },
    rfiDueDate: { type: Type.STRING, description: "The deadline for submitting Requests for Information (RFIs) in ISO 8601 format." },
    siteVisitDate: { type: Type.STRING, description: "The date and time of the site visit or pre-bid conference in ISO 8601 format." },
    isSiteVisitMandatory: { type: Type.BOOLEAN, description: "True if the site visit or pre-bid conference is mandatory." },
    rsvpDeadline: { type: Type.STRING, description: "The deadline to RSVP for the site visit in ISO 8601 format." },
    bidBondRequirement: { type: Type.STRING, description: "The bid bond percentage or amount required (e.g. '10%', '$5,000')." },
  },
  required: ["projectName", "agencyName", "isSiteVisitMandatory"],
};

// Retry configuration
const MAX_RETRIES = 4;
const BASE_DELAY = 2000; // 2 seconds

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Error classification
function classifyError(error: any): AppError {
  const message = error?.message || String(error);
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('timeout')) {
    return {
      type: 'network_error',
      message: 'Network connection failed',
      details: 'Unable to reach the AI service. Please check your internet connection and try again.',
      retryable: true,
    };
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429') || lowerMessage.includes('quota')) {
    return {
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      details: 'Too many requests. Please wait a moment before trying again.',
      retryable: true,
    };
  }

  // API errors
  if (lowerMessage.includes('api') || lowerMessage.includes('401') || lowerMessage.includes('403')) {
    return {
      type: 'api_error',
      message: 'API authentication failed',
      details: 'Please check your API key configuration.',
      retryable: false,
    };
  }

  // Invalid document
  if (lowerMessage.includes('invalid') || lowerMessage.includes('corrupt') || lowerMessage.includes('cannot read')) {
    return {
      type: 'invalid_document',
      message: 'Invalid document format',
      details: 'The document could not be read. Please ensure it is a valid PDF or image file.',
      retryable: false,
    };
  }

  // Extraction failed
  if (lowerMessage.includes('extract') || lowerMessage.includes('parse') || lowerMessage.includes('json')) {
    return {
      type: 'extraction_failed',
      message: 'Data extraction failed',
      details: 'Could not extract bid information from the document. Try a clearer scan or manual entry.',
      retryable: true,
    };
  }

  // Default unknown error
  return {
    type: 'unknown',
    message: 'An unexpected error occurred',
    details: message,
    retryable: true,
  };
}

// Retry wrapper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  onRetry?: (attempt: number, delay: number) => void
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const classifiedError = classifyError(error);

      // Don't retry non-retryable errors
      if (!classifiedError.retryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 2s, 4s, 8s, 16s
      const delay = BASE_DELAY * Math.pow(2, attempt);
      onRetry?.(attempt + 1, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

// Redaction helper
export function applyRedaction(text: string, settings: RedactionSettings): string {
  if (!settings.enabled || !settings.patterns.length) {
    return text;
  }

  let redacted = text;
  for (const pattern of settings.patterns) {
    try {
      const regex = new RegExp(pattern, 'gi');
      redacted = redacted.replace(regex, '[REDACTED]');
    } catch {
      // Invalid regex, skip
    }
  }
  return redacted;
}

/**
 * Extracts bid information from a base64 encoded document using Gemini.
 */
export async function extractBidInfo(
  fileBase64: string,
  mimeType: string,
  onRetry?: (attempt: number, delay: number) => void
): Promise<ExtractedBidData> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this bidding document and extract the key details into the specified JSON format.
            Return dates in strict ISO 8601 format. If time isn't mentioned, use 17:00:00.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    const parsed = JSON.parse(text) as ExtractedBidData;

    // Validate that we got at least one date
    const hasDate = parsed.bidDueDate || parsed.rfiDueDate || parsed.siteVisitDate;
    if (!hasDate) {
      console.warn("No dates found in document");
    }

    return parsed;
  }, MAX_RETRIES, onRetry);
}

/**
 * Asks a technical question about the bid document.
 */
export async function askAssistant(
  prompt: string,
  fileBase64: string,
  mimeType: string,
  onRetry?: (attempt: number, delay: number) => void
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from assistant");
    return text;
  }, MAX_RETRIES, onRetry);
}

/**
 * Summarizes the conversation between user and assistant.
 */
export async function summarizeConversation(
  messages: { role: string; text: string }[],
  onRetry?: (attempt: number, delay: number) => void
): Promise<string> {
  if (messages.length === 0) return "No conversation to summarize.";

  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const conversationContext = messages
    .map(m => `${m.role.toUpperCase()}: ${m.text}`)
    .join('\n');

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: `Summarize the following conversation between a construction estimator and an AI assistant regarding a bidding document.
      Extract only the most critical takeaways, risks, or requirements discussed.
      Format as a concise bulleted list.

      CONVERSATION:
      ${conversationContext}`,
      config: {
        systemInstruction: "You are an expert construction bid analyst. Your goal is to provide high-density, low-word-count summaries of technical conversations.",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No summary generated");
    return text;
  }, MAX_RETRIES, onRetry);
}

// API key management utilities
export function setCustomApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }
}

export function getCustomApiKey(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gemini_api_key');
  }
  return null;
}

export function hasCustomApiKey(): boolean {
  return !!getCustomApiKey();
}

// Export model info for UI
export const MODEL_INFO = {
  name: DEFAULT_MODEL,
  limits: {
    requestsPerMinute: 10,
    tokensPerMinute: 250_000,
    requestsPerDay: 250,
  },
};

// Export error utilities
export { classifyError, type AppError };
