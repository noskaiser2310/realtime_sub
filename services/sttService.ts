
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT, SUPPORTED_LANGUAGES } from '../constants'; // Assuming SUPPORTED_LANGUAGES might be useful for language name mapping if needed for prompts

const API_KEY = process.env.API_KEY;

const getAiClient = () => {
  if (!API_KEY) {
    console.error("API_KEY for Gemini (STT Service) is not set. Please set the process.env.API_KEY environment variable.");
    throw new Error("Gemini API Key is not configured for STT Service.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const processAudioTranscriptionTask = async (
  base64AudioData: string,
  mimeType: string,
  languageCode: string, // BCP-47 language code for STT hinting
  options?: {
    temperature?: number;
    maxOutputTokens?: number; 
    topP?: number;
    topK?: number;
  }
): Promise<string> => {
  const ai = getAiClient();
  
  const audioPart = {
    inlineData: {
      mimeType: mimeType,
      data: base64AudioData,
    },
  };

  // Construct a more specific prompt for transcription if languageCode is available
  const languageName = SUPPORTED_LANGUAGES.find(l => l.code.startsWith(languageCode.split('-')[0]))?.name || languageCode;
  let promptText = `Transcribe the following audio accurately.`;
  if (languageCode) {
    promptText += ` The audio is in ${languageName} (language code: ${languageCode}). Provide only the text of the transcription.`;
  } else {
    promptText += ` Provide only the text of the transcription.`;
  }
  // Future: Add context or specific vocabulary hints if API supports more complex prompting for STT.

  const textPart = { text: promptText };

  let retries = 0;
  while (retries <= MAX_RETRIES) {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT, 
        contents: { parts: [audioPart, textPart] }, 
        config: {
          temperature: options?.temperature ?? 0.25, 
          ...(options?.maxOutputTokens && { maxOutputTokens: options.maxOutputTokens }),
          ...(options?.topP && { topP: options.topP }),
          ...(options?.topK && { topK: options.topK }),
        }
      });

      const transcribedText = response.text?.trim() ?? ''; 
      
      if (transcribedText === '' && retries === 0) {
        console.warn("STT Service: Gemini API returned an empty transcription on the first attempt. This might be due to silent/short audio, or a non-speech audio source.");
      }
      
      return transcribedText;

    } catch (error) {
      const currentErrorMessage = (error as Error).message || "Unknown error";
      console.error(`STT Service: Gemini API audio transcription (attempt ${retries + 1}/${MAX_RETRIES + 1}) failed:`, error);
      
      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(`STT Service: Failed to transcribe audio after ${MAX_RETRIES + 1} attempts: ${currentErrorMessage}`);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retries -1)));
    }
  }
  throw new Error(`STT Service: Max retries exceeded in processAudioTranscriptionTask (unexpected state).`);
};

export const sttService = {
  transcribeAudio: async (
    base64AudioData: string,
    mimeType: string,
    languageCode: string // BCP-47 language code, e.g., 'en-US', 'vi-VN'
  ): Promise<string> => {
    try {
      return await processAudioTranscriptionTask(base64AudioData, mimeType, languageCode, { temperature: 0.25, topK: 40 });
    } catch (error) {
       console.error("STT Service: transcribeAudio error:", error);
       const finalErrorMessage = error instanceof Error ? error.message : String(error);
       // For STT, if it fails, an empty string might be an acceptable fallback for a chunk rather than throwing and stopping all.
       // However, for now, let's rethrow so App.tsx/audioService can decide how to handle.
       // To return empty on error: return "";
       throw new Error(`STT Service: Failed to transcribe audio recording: ${finalErrorMessage}`);
    }
  }
};
