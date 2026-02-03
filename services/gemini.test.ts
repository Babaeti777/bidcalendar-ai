import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mock for generateContent that we can control
const mockGenerateContent = vi.fn();

// Mock the @google/genai module with a proper class constructor
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      };
      constructor() {}
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      BOOLEAN: 'BOOLEAN',
    },
  };
});

// Import after mock is set up
import { extractBidInfo, askAssistant, summarizeConversation } from './gemini';

describe('gemini service', () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('extractBidInfo', () => {
    const mockBase64 = 'base64encodedcontent';
    const mockMimeType = 'application/pdf';

    it('returns parsed bid data on success', async () => {
      const mockResponse = {
        projectName: 'Test Project',
        agencyName: 'Test Agency',
        projectAddress: '123 Main St',
        bidDueDate: '2025-01-15T17:00:00.000Z',
        rfiDueDate: '2025-01-10T17:00:00.000Z',
        siteVisitDate: '2025-01-05T10:00:00.000Z',
        isSiteVisitMandatory: true,
        rsvpDeadline: '2025-01-03T17:00:00.000Z',
        bidBondRequirement: '10%',
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResponse),
      });

      const result = await extractBidInfo(mockBase64, mockMimeType);

      expect(result).toEqual(mockResponse);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('throws error when response text is empty', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: null,
      });

      await expect(extractBidInfo(mockBase64, mockMimeType)).rejects.toThrow(
        'No response text from Gemini'
      );
    });

    it('throws error when API call fails', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockGenerateContent.mockRejectedValueOnce(apiError);

      await expect(extractBidInfo(mockBase64, mockMimeType)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('throws error when response is invalid JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'not valid json',
      });

      await expect(extractBidInfo(mockBase64, mockMimeType)).rejects.toThrow();
    });

    it('passes correct parameters to Gemini API', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ projectName: 'Test', agencyName: 'Agency', isSiteVisitMandatory: false }),
      });

      await extractBidInfo(mockBase64, mockMimeType);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3-pro-preview',
          contents: expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({
                inlineData: {
                  data: mockBase64,
                  mimeType: mockMimeType,
                },
              }),
            ]),
          }),
          config: expect.objectContaining({
            responseMimeType: 'application/json',
          }),
        })
      );
    });
  });

  describe('askAssistant', () => {
    const mockPrompt = 'What is the required insurance coverage?';
    const mockBase64 = 'base64content';
    const mockMimeType = 'application/pdf';

    it('returns assistant response text', async () => {
      const expectedResponse = 'The required insurance coverage is $1,000,000 general liability.';
      mockGenerateContent.mockResolvedValueOnce({
        text: expectedResponse,
      });

      const result = await askAssistant(mockPrompt, mockBase64, mockMimeType);

      expect(result).toBe(expectedResponse);
    });

    it('passes user prompt to Gemini API', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
      });

      await askAssistant(mockPrompt, mockBase64, mockMimeType);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({ text: mockPrompt }),
            ]),
          }),
        })
      );
    });

    it('throws error when API fails', async () => {
      const apiError = new Error('Network error');
      mockGenerateContent.mockRejectedValueOnce(apiError);

      await expect(
        askAssistant(mockPrompt, mockBase64, mockMimeType)
      ).rejects.toThrow('Network error');
    });

    it('includes document in request', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response',
      });

      await askAssistant(mockPrompt, mockBase64, mockMimeType);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({
                inlineData: {
                  data: mockBase64,
                  mimeType: mockMimeType,
                },
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('summarizeConversation', () => {
    it('returns early message for empty conversation', async () => {
      const result = await summarizeConversation([]);
      expect(result).toBe('No conversation to summarize.');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('summarizes non-empty conversation', async () => {
      const messages = [
        { role: 'user', text: 'What is the bid bond requirement?' },
        { role: 'assistant', text: 'The bid bond requirement is 10% of the bid amount.' },
      ];

      const expectedSummary = '- Bid bond requirement: 10% of bid amount';
      mockGenerateContent.mockResolvedValueOnce({
        text: expectedSummary,
      });

      const result = await summarizeConversation(messages);

      expect(result).toBe(expectedSummary);
    });

    it('formats conversation context correctly', async () => {
      const messages = [
        { role: 'user', text: 'Question 1' },
        { role: 'assistant', text: 'Answer 1' },
      ];

      mockGenerateContent.mockResolvedValueOnce({
        text: 'Summary',
      });

      await summarizeConversation(messages);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('USER: Question 1'),
        })
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('ASSISTANT: Answer 1'),
        })
      );
    });

    it('throws error when API fails', async () => {
      const messages = [{ role: 'user', text: 'Test' }];
      const apiError = new Error('Summarization failed');
      mockGenerateContent.mockRejectedValueOnce(apiError);

      await expect(summarizeConversation(messages)).rejects.toThrow(
        'Summarization failed'
      );
    });

    it('includes system instruction for construction context', async () => {
      const messages = [{ role: 'user', text: 'Test' }];
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Summary',
      });

      await summarizeConversation(messages);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemInstruction: expect.stringContaining('construction bid analyst'),
          }),
        })
      );
    });
  });
});
