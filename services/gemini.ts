
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedBidData } from "../types";

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

/**
 * Extracts bid information from a base64 encoded document using Gemini.
 */
export async function extractBidInfo(fileBase64: string, mimeType: string): Promise<ExtractedBidData> {
  // Create a new instance for every call to ensure updated API Key is used from the environment.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");
    return JSON.parse(text) as ExtractedBidData;
  } catch (error) {
    console.error("Error extracting bid info:", error);
    throw error;
  }
}

/**
 * Asks a technical question about the bid document.
 */
export async function askAssistant(prompt: string, fileBase64: string, mimeType: string) {
  // Create a new instance for every call to ensure updated API Key is used from the environment.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });
    return response.text;
  } catch (error) {
    console.error("Assistant error:", error);
    throw error;
  }
}

/**
 * Summarizes the conversation between user and assistant.
 */
export async function summarizeConversation(messages: { role: string; text: string }[]) {
  if (messages.length === 0) return "No conversation to summarize.";
  
  // Create a new instance for every call to ensure updated API Key is used from the environment.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const conversationContext = messages
    .map(m => `${m.role.toUpperCase()}: ${m.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Summarize the following conversation between a construction estimator and an AI assistant regarding a bidding document. 
      Extract only the most critical takeaways, risks, or requirements discussed. 
      Format as a concise bulleted list.
      
      CONVERSATION:
      ${conversationContext}`,
      config: {
        systemInstruction: "You are an expert construction bid analyst. Your goal is to provide high-density, low-word-count summaries of technical conversations.",
        thinkingConfig: { thinkingBudget: 32768 },
      }
    });
    return response.text;
  } catch (error) {
    console.error("Summarization error:", error);
    throw error;
  }
}
