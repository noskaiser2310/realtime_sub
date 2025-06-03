import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT, SUPPORTED_LANGUAGES } from '../constants';

// Thay thế API_KEY cũ bằng Key Rotator
class GeminiKeyRotator {
  private apiKeys: string[];
  private currentKeyIndex = 0;
  private keyStates: { exhaustedUntil?: number }[];

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys;
    this.keyStates = apiKeys.map(() => ({}));
  }

  getNextKey(): string | null {
    const now = Date.now();
    for (let i = 0; i < this.apiKeys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.apiKeys.length;
      const state = this.keyStates[idx];
      if (!state.exhaustedUntil || state.exhaustedUntil < now) {
        this.currentKeyIndex = (idx + 1) % this.apiKeys.length;
        return this.apiKeys[idx];
      }
    }
    return null;
  }

  markKeyExhausted(key: string, cooldownMs = 3600000) {
    const index = this.apiKeys.indexOf(key);
    if (index !== -1) {
      this.keyStates[index] = { exhaustedUntil: Date.now() + cooldownMs };
    }
  }
}

// Khởi tạo rotator với nhiều API keys
// const API_KEYS = process.env.API_KEYS?.split(',') || [];
const API_KEYS = ['AIzaSyABy3VklRPeQjufLX9SC3gAyASdEHNgKUo','AIzaSyDec1jjpSRgSn0XTGg4ZicSGtqiNdsREtw','AIzaSyB1q7zpFPXJkKwjet4yolkIr9mGT_rsGbQ','AIzaSyAiudI6TqCUefpcF3J1TpYHFKnv658ZW0I']
const keyRotator = new GeminiKeyRotator(API_KEYS);

const getAiClient = () => {
  const apiKey = keyRotator.getNextKey();
  if (!apiKey) {
    console.error("All API keys for Gemini (STT Service) are exhausted.");
    throw new Error("All Gemini API Keys are currently unavailable.");
  }
  return {
    genAI: new GoogleGenAI({ apiKey }),
    currentKey: apiKey
  };
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const processAudioTranscriptionTask = async (
  base64AudioData: string,
  mimeType: string,
  languageCode: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number; 
    topP?: number;
    topK?: number;
  }
): Promise<string> => {
  const { genAI, currentKey } = getAiClient();
  
  const audioPart = {
    inlineData: {
      mimeType: mimeType,
      data: base64AudioData,
    },
  };

  const languageName = SUPPORTED_LANGUAGES.find(l => l.code.startsWith(languageCode.split('-')[0]))?.name || languageCode;
  let promptText = `Transcribe the following audio accurately.`;
  if (languageCode) {
    promptText += ` The audio is in ${languageName} (language code: ${languageCode}). Provide only the text of the transcription.`;
  }

  const textPart = { text: promptText };

  let retries = 0;
  while (retries <= MAX_RETRIES) {
    try {
      const response: GenerateContentResponse = await genAI.models.generateContent({
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
        console.warn("STT Service: Gemini API returned an empty transcription on the first attempt.");
      }
      
      return transcribedText;

    } catch (error) {
      const currentErrorMessage = (error as Error).message || "Unknown error";
      console.error(`STT Service: Gemini API audio transcription (attempt ${retries + 1}/${MAX_RETRIES + 1}) failed:`, error);
      
      // Nếu lỗi liên quan đến quota/rate limit, đánh dấu key hiện tại là exhausted
      if (currentErrorMessage.includes('429') || currentErrorMessage.includes('quota') || currentErrorMessage.includes('limit')) {
        keyRotator.markKeyExhausted(currentKey);
      }
      
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
    languageCode: string
  ): Promise<string> => {
    try {
      return await processAudioTranscriptionTask(base64AudioData, mimeType, languageCode, { temperature: 0.25, topK: 40 });
    } catch (error) {
       console.error("STT Service: transcribeAudio error:", error);
       const finalErrorMessage = error instanceof Error ? error.message : String(error);
       throw new Error(`STT Service: Failed to transcribe audio recording: ${finalErrorMessage}`);
    }
  }
};