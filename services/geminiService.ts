
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT, SUPPORTED_LANGUAGES, SUMMARY_PROMPT_TEMPLATES } from '../constants';
import { SummaryType } from "../types";

const API_KEY = process.env.API_KEY;

const getAiClient = () => {
  if (!API_KEY) {
    console.error("API_KEY for Gemini is not set. Please set the process.env.API_KEY environment variable.");
    throw new Error("Gemini API Key is not configured.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// --- Meta Prompt System ---
const META_PROMPT_SYSTEM_BASE = `You are an advanced AI assistant. Your primary function is to process user requests accurately and efficiently.
You MUST strictly adhere to the output format specified for each task.
DO NOT include any other text, explanations, or conversational filler before or after the specified output format.
Be concise and direct.`;

const TASK_SPECIFIC_GUIDANCE = {
  TRANSLATION: `Output format for translations: Start the translated text with "[TRANSLATION]: "
Example:
User task: Translate "Hello world" from English to French.
Expected output: [TRANSLATION]: Bonjour le monde`,
  SUMMARY_KEY_POINTS: `Output format for key points summaries: Start the summary with "[SUMMARY_KEY_POINTS]: " and use bullet points.
Example:
User task: Summarize key points for "The meeting discussed project alpha and budget constraints."
Expected output: [SUMMARY_KEY_POINTS]: 
* Discussed project alpha
* Discussed budget constraints`,
  SUMMARY_ACTION_ITEMS: `Output format for action items summaries: Start the summary with "[SUMMARY_ACTION_ITEMS]: " and use bullet points. If no action items, state "[SUMMARY_ACTION_ITEMS]: No action items identified."
Example:
User task: Summarize action items for "The meeting notes: John to email client."
Expected output: [SUMMARY_ACTION_ITEMS]: 
* John to email client.`,
  CHATBOT_RESPONSE: `Output format for chatbot responses: Start the response with "[CHATBOT_RESPONSE]: "
Example:
User's question is based on a provided transcript.
If the information is found: "[CHATBOT_RESPONSE]: The CEO said profits are up."
If the information is not in the transcript: "[CHATBOT_RESPONSE]: Information not found in the provided transcript."`
};

type TaskType = keyof typeof TASK_SPECIFIC_GUIDANCE;

const OUTPUT_PATTERNS = {
  TRANSLATION: /\[TRANSLATION\]:\s*([\s\S]*)/,
  SUMMARY_KEY_POINTS: /\[SUMMARY_KEY_POINTS\]:\s*([\s\S]*)/,
  SUMMARY_ACTION_ITEMS: /\[SUMMARY_ACTION_ITEMS\]:\s*([\s\S]*)/,
  CHATBOT_RESPONSE: /\[CHATBOT_RESPONSE\]:\s*([\s\S]*)/,
};

class GeminiOutputFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiOutputFormatError";
  }
}

const buildFullPrompt = (userTaskDescription: string, taskType: TaskType): string => {
  let prompt = META_PROMPT_SYSTEM_BASE + "\n\n" + TASK_SPECIFIC_GUIDANCE[taskType];
  prompt += "\n\n--- USER TASK ---\n" + userTaskDescription;
  prompt += "\n\n--- AI RESPONSE ---";
  return prompt;
};

const extractOutput = (responseText: string, pattern: RegExp, taskTypeForLog: string): string => {
  const match = responseText.match(pattern);
  if (match && match[1]) {
    return match[1].trim();
  }
  console.warn(`Output pattern not found in response for ${taskTypeForLog}:`, responseText, "Pattern:", pattern);
  if (!responseText.startsWith("[") && responseText.length > 0) { 
    return responseText.trim();
  }
  throw new GeminiOutputFormatError(`Failed to extract content for ${taskTypeForLog} using pattern. Raw response: "${responseText}"`);
};

const processGenericTask = async (
  userTaskDescription: string,
  taskType: TaskType,
  expectedOutputPattern: RegExp,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  }
): Promise<string> => {
  const ai = getAiClient();
  const fullPrompt = buildFullPrompt(userTaskDescription, taskType);

  let retries = 0;
  while (retries <= MAX_RETRIES) {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_TEXT,
        contents: fullPrompt,
        config: {
          temperature: options?.temperature ?? 0.5,
          ...(options?.maxOutputTokens && { maxOutputTokens: options.maxOutputTokens }),
          ...(options?.topP && { topP: options.topP }),
          ...(options?.topK && { topK: options.topK }),
        }
      });

      const rawText = response.text?.trim() || '';
      return extractOutput(rawText, expectedOutputPattern, taskType);

    } catch (error) {
      const currentErrorMessage = (error as Error).message || "Unknown error";
      if (typeof currentErrorMessage === 'string' && (currentErrorMessage.includes('500') || currentErrorMessage.toLowerCase().includes('server error') || currentErrorMessage.toLowerCase().includes('unknown'))) {
        console.error(`Gemini API task "${taskType}" (attempt ${retries + 1}/${MAX_RETRIES + 1}) encountered a potential server-side error. This is likely an issue with the API service. Full error:`, error);
      } else {
        console.error(`Gemini API error during task "${taskType}" (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, error);
      }
      
      if (error instanceof GeminiOutputFormatError) {
          throw error; 
      }

      retries++;
      if (retries > MAX_RETRIES) {
        throw new Error(`Failed to process task ${taskType} after ${MAX_RETRIES + 1} attempts: ${currentErrorMessage}`);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retries -1)));
    }
  }
  throw new Error(`Max retries exceeded in processGenericTask for ${taskType} (unexpected state).`);
};

export const translateText = async (
  text: string,
  sourceLangCode: string,
  targetLangCode: string,
  options?: {
    context?: string;
    preserveFormatting?: boolean;
    formalRegister?: boolean;
  }
): Promise<string> => {
  const sourceLanguageName = SUPPORTED_LANGUAGES.find(l => l.code === sourceLangCode)?.name || sourceLangCode;
  const targetLanguageName = SUPPORTED_LANGUAGES.find(l => l.code === targetLangCode)?.name || targetLangCode;

  let taskDescription = `Translate the following text from ${sourceLanguageName} to ${targetLanguageName}.`;
  if (options?.context) taskDescription += `\nContext: "${options.context}"`;
  if (options?.preserveFormatting) taskDescription += "\nPreserve original formatting (e.g., line breaks, markdown) as much as possible in the translation.";
  if (options?.formalRegister) taskDescription += "\nUse a formal register for the translation.";
  taskDescription += `\nText to translate: "${text}"`;

  try {
    return await processGenericTask(taskDescription, "TRANSLATION", OUTPUT_PATTERNS.TRANSLATION, { temperature: 0.2, topP: 0.8, topK: 40 });
  } catch (error) {
     console.error("Gemini translateText error:", error);
     if (error instanceof GeminiOutputFormatError && (error.message.includes("Raw response:"))) {
        const rawResponseMatch = error.message.match(/Raw response: "([\s\S]*)"/);
        if (rawResponseMatch && rawResponseMatch[1]) {
          console.warn("TranslateText: Output format error, returning raw response as fallback.");
          return rawResponseMatch[1];
        }
     }
     throw new Error(`Failed to translate text: ${(error as Error).message}`);
  }
};

export const summarizeText = async (
  text: string,
  summaryType: SummaryType,
  languageCode: string,
  options?: {
    targetLength?: 'short' | 'medium' | 'long' | number;
    focusAreas?: string[];
    excludeTopics?: string[];
    outputLanguage?: string;
  }
): Promise<string> => {
  const languageName = SUPPORTED_LANGUAGES.find(l => l.code === languageCode)?.name || languageCode;
  const outputLanguageName = options?.outputLanguage 
    ? SUPPORTED_LANGUAGES.find(l => l.code === options.outputLanguage)?.name || options.outputLanguage
    : languageName;

  const basePromptTemplate = SUMMARY_PROMPT_TEMPLATES[summaryType];
  if (!basePromptTemplate) throw new Error(`Unsupported summary type: ${summaryType}`);
  
  let taskDescription = basePromptTemplate(text, languageName);
  taskDescription = taskDescription.replace(`The transcript is in ${languageName}.`, `The transcript is in ${languageName}. The summary should be in ${outputLanguageName}.`);

  if (options?.targetLength) {
    if (typeof options.targetLength === 'number') taskDescription += `\nAim for a summary of approximately ${options.targetLength} words.`;
    else taskDescription += `\nProduce a ${options.targetLength} summary.`;
  }
  if (options?.focusAreas && options.focusAreas.length > 0) taskDescription += `\nFocus particularly on these areas: ${options.focusAreas.join(', ')}.`;
  if (options?.excludeTopics && options.excludeTopics.length > 0) taskDescription += `\nExclude these topics from the summary: ${options.excludeTopics.join(', ')}.`;
  
  const taskType = summaryType === SummaryType.KeyPoints ? "SUMMARY_KEY_POINTS" : "SUMMARY_ACTION_ITEMS";
  const expectedPattern = summaryType === SummaryType.KeyPoints 
    ? OUTPUT_PATTERNS.SUMMARY_KEY_POINTS 
    : OUTPUT_PATTERNS.SUMMARY_ACTION_ITEMS;

  try {
    return await processGenericTask(taskDescription, taskType, expectedPattern, { temperature: 0.3, topP: 0.9, topK: 50 });
  } catch (error) {
    console.error(`Gemini summarizeText error (${summaryType}):`, error);
    if (error instanceof GeminiOutputFormatError && (error.message.includes("Raw response:"))) {
        const rawResponseMatch = error.message.match(/Raw response: "([\s\S]*)"/);
        if (rawResponseMatch && rawResponseMatch[1]) {
          if (summaryType === SummaryType.ActionItems && /no action items/i.test(rawResponseMatch[1])) {
            console.warn("SummarizeText (ActionItems): Output format error, but seems like a valid 'no action items' response. Returning raw.");
            return rawResponseMatch[1];
          }
          console.warn(`SummarizeText (${summaryType}): Output format error, returning raw response as fallback.`);
          return rawResponseMatch[1];
        }
     }
    throw new Error(`Failed to summarize text for ${summaryType}: ${(error as Error).message}`);
  }
};

export const answerFromTranscript = async (
  transcript: string,
  question: string,
  transcriptLanguageName: string 
): Promise<string> => {
  const userTaskDescription = `Based *only* on the following transcript (language: ${transcriptLanguageName}), answer the user's question.
If the answer is not found in the transcript, clearly state that the information is not available in the provided text.
The answer MUST be in ${transcriptLanguageName}.

Transcript:
"""
${transcript}
"""

User Question: "${question}"`;

  try {
    return await processGenericTask(userTaskDescription, "CHATBOT_RESPONSE", OUTPUT_PATTERNS.CHATBOT_RESPONSE, { temperature: 0.2, topK: 40, topP: 0.95 });
  } catch (error) {
     console.error("Gemini answerFromTranscript error:", error);
     if (error instanceof GeminiOutputFormatError && (error.message.includes("Raw response:"))) {
        const rawResponseMatch = error.message.match(/Raw response: "([\s\S]*)"/);
        if (rawResponseMatch && rawResponseMatch[1]) {
          console.warn("answerFromTranscript: Output format error, returning raw response as fallback.");
          return rawResponseMatch[1];
        }
     }
     const finalErrorMessage = error instanceof Error ? error.message : String(error);
     throw new Error(`Failed to get answer from transcript: ${finalErrorMessage}`);
  }
};

// processBatchTasks and validateOutputFormat remain as they are generic text task helpers
export const processBatchTasks = async (tasks: {description: string, taskType: TaskType, pattern: RegExp}[]) => {
    const results = [];
    for (const task of tasks) {
        try {
            const result = await processGenericTask(task.description, task.taskType, task.pattern);
            results.push({success: true, data: result});
        } catch (error) {
            results.push({success: false, error: (error as Error).message});
        }
    }
    return results;
};

export const validateOutputFormat = (text: string, type: keyof typeof OUTPUT_PATTERNS): boolean => {
    return OUTPUT_PATTERNS[type].test(text);
};
