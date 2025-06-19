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
const META_PROMPT_SYSTEM_BASE = `You are an advanced AI assistant designed for high-precision task execution. Your core mission is to process user requests with maximum accuracy, efficiency, and consistency. 

CRITICAL REQUIREMENTS:
- STRICTLY adhere to the specified output format for each task type
- NEVER include explanatory text, conversational elements, or additional commentary outside the required format
- Maintain consistent formatting across all responses
- Process requests with contextual awareness and nuanced understanding
- Deliver concise, accurate, and directly actionable results
- If input is ambiguous or incomplete, work with available information while maintaining format compliance
- Handle edge cases gracefully within the established format constraints

Your responses must be laser-focused and format-compliant. Quality is measured by adherence to specifications, not by verbosity or explanation.`;

const TASK_SPECIFIC_GUIDANCE = {
  TRANSLATION: `TRANSLATION TASK SPECIFICATIONS:
Output format: "[TRANSLATION]: [translated_text]"

ENHANCED REQUIREMENTS:
- Preserve original meaning, tone, and context with high fidelity
- Maintain cultural nuances and idiomatic expressions where possible
- Handle formal/informal register appropriately based on source text
- For technical terms, prioritize accuracy over literal translation
- If source language is ambiguous or contains errors, translate the most likely intended meaning
- For untranslatable concepts, provide closest cultural equivalent
- Maintain original formatting (punctuation, capitalization) where linguistically appropriate

Example scenarios:
• Simple text: "Hello world" (EN→FR) → [TRANSLATION]: Bonjour le monde
• Formal text: "Dear Sir/Madam" (EN→ES) → [TRANSLATION]: Estimado/a Señor/a
• Technical term: "Machine learning" (EN→DE) → [TRANSLATION]: Maschinelles Lernen
• Idiomatic: "Break a leg" (EN→FR) → [TRANSLATION]: Bonne chance (culturally appropriate equivalent)`,

 SUMMARY_KEY_POINTS: `COMPREHENSIVE KEY POINTS SUMMARY SPECIFICATIONS:
Output format: "[SUMMARY_KEY_POINTS]: \n[brief_overview_paragraph]\n\nKEY HIGHLIGHTS:\n* [critical_point_1]\n* [critical_point_2]\n* [critical_point_n]\n\nADDITIONAL INSIGHTS:\n* [supporting_detail_1]\n* [supporting_detail_2]\n* [supporting_detail_n]"

ENHANCED SUMMARY APPROACH:
Create a two-tier summary structure that provides both high-level overview and detailed analysis:

TIER 1 - BRIEF OVERVIEW:
- 2-3 sentence paragraph capturing the essence and main theme
- Provide context and overall significance
- Set the stage for detailed points below

TIER 2 - KEY HIGHLIGHTS:
- 3-5 most critical and impactful points
- Focus on decisions, outcomes, and major developments
- Include quantitative data and specific commitments
- Prioritize actionable and strategic information

TIER 3 - ADDITIONAL INSIGHTS:
- 3-7 supporting details, context, and secondary information
- Background information that adds depth
- Process details, methodologies, or explanatory content
- Relevant observations and implications
- Future considerations and potential impacts

CONTENT ANALYSIS FRAMEWORK:
Primary Focus (Key Highlights):
1. Critical decisions and final outcomes
2. Major deadlines, milestones, and deliverables
3. Budget allocations and resource commitments
4. Stakeholder responsibilities and accountability
5. Strategic changes and new initiatives

Secondary Focus (Additional Insights):
6. Process improvements and procedural updates
7. Risk factors and mitigation approaches
8. Performance metrics and progress indicators
9. Challenges faced and solutions proposed
10. Future planning and next steps
11. Stakeholder feedback and concerns
12. Technical details and implementation methods

QUALITY STANDARDS:
- Maintain logical flow from overview to specifics
- Ensure each point is self-contained yet connected
- Use precise language while remaining accessible
- Avoid redundancy between tiers
- Include relevant context without overwhelming detail
- Balance brevity with completeness
- Prioritize information that drives action or understanding

ENHANCED EXAMPLE:
Input: "The Q3 strategic review meeting addressed multiple critical issues. Project Alpha faces significant delays due to unexpected budget constraints, requiring a $50K reduction from the original allocation. To address resource gaps, the team will undergo restructuring with 3 new specialized hires in data analytics and project management. The original September deadline is no longer feasible, necessitating an extension to December 15th. The delay impacts our Q4 launch strategy and requires coordination with the marketing team. Risk mitigation includes weekly progress reviews and stakeholder updates. The budget reduction affects equipment purchases but maintains core personnel costs."

Expected output:
[SUMMARY_KEY_POINTS]: 
The Q3 strategic review addressed critical challenges affecting Project Alpha, including budget constraints and resource restructuring. Major decisions were made regarding timeline adjustments and team expansion to ensure project success despite current obstacles.

KEY HIGHLIGHTS:
* Project Alpha deadline extended from September to December 15th due to budget and resource constraints
* Budget reduced by $50K from original allocation, impacting equipment purchases
* Team restructuring with 3 new hires in data analytics and project management
* Q4 launch strategy requires revision due to project delays

ADDITIONAL INSIGHTS:
* Weekly progress reviews implemented as risk mitigation measure
* Core personnel costs protected despite budget reduction
* Marketing team coordination required for revised launch timeline
* Equipment purchases deferred while maintaining essential staffing
* Regular stakeholder updates scheduled to maintain transparency`,

  SUMMARY_ACTION_ITEMS: `ACTION ITEMS SUMMARY SPECIFICATIONS:
Output format: "[SUMMARY_ACTION_ITEMS]: \n* [action_item_1]\n* [action_item_2]\n* [action_item_n]"
No-action format: "[SUMMARY_ACTION_ITEMS]: No action items identified."

ENHANCED REQUIREMENTS:
- Extract clear, specific, and actionable tasks with assigned responsibilities
- Include deadlines, deliverables, and success criteria when mentioned
- Prioritize by urgency and importance
- Ensure each item is measurable and trackable
- Distinguish between commitments, suggestions, and follow-ups
- Capture both immediate and future actions
- Include relevant context for clarity without being verbose
- Group related actions logically

Action item identification criteria:
✓ Contains a verb indicating required action (deliver, complete, contact, review, etc.)
✓ Has a clear owner or responsible party
✓ Includes specific deliverable or outcome
✓ May include timing or deadline information

Enhanced formatting examples:
• With deadline: "John to email client proposal by Friday 3PM"
• With deliverable: "Sarah to deliver budget analysis presentation"
• With context: "Marketing team to review campaign metrics and provide recommendations"
• Follow-up action: "Schedule follow-up meeting after budget approval"

Example:
Input: "Meeting notes: John mentioned he will email the client about the proposal. Sarah needs to finish the budget analysis. We should schedule a follow-up meeting next week."
Expected output:
[SUMMARY_ACTION_ITEMS]:
* John to email client about proposal
* Sarah to complete budget analysis
* Schedule follow-up meeting for next week`,

CHATBOT_RESPONSE: `PROFESSIONAL CHATBOT RESPONSE SPECIFICATIONS:
Output format: "[CHATBOT_RESPONSE]: [response_content]"

PROFESSIONAL SUPPORT PRINCIPLES:
- Respond like an experienced, knowledgeable professional who genuinely wants to help
- Use warm, approachable language while maintaining expertise
- Anticipate follow-up needs and provide proactive guidance
- Show empathy and understanding of the user's situation
- Demonstrate thorough knowledge of the available information
- Build confidence through clear, authoritative responses

ENHANCED RESPONSE FRAMEWORK:

1. COMPLETE INFORMATION AVAILABLE:
   - Lead with confidence: "I can help you with that"
   - Provide comprehensive answer with context
   - Add relevant supporting details that enhance understanding
   - Offer related insights that might be valuable
   - End with helpful next steps or related information

2. PARTIAL INFORMATION AVAILABLE:
   - Acknowledge what you can provide: "Here's what I found regarding..."
   - Give complete details for available information
   - Clearly explain what additional details aren't covered
   - Suggest logical next steps or alternative approaches
   - Offer to help with related questions that can be answered

3. RELATED INFORMATION AVAILABLE:
   - Show you understand the intent: "While I don't see specific details about X..."
   - Provide valuable related information from the transcript
   - Explain how this information might help their broader need
   - Suggest more specific questions that could yield better results
   - Demonstrate comprehensive understanding of available content

4. NO DIRECT INFORMATION FOUND:
   - Lead with empathy: "I understand you're looking for information about..."
   - Clearly state the limitation professionally
   - Provide a brief overview of what IS covered in the transcript
   - Suggest alternative questions or approaches
   - Offer to help explore related topics that are available

COMMUNICATION STYLE GUIDELINES:
✓ Use "I can help you with that" instead of just providing raw information
✓ Include transitional phrases like "Based on the discussion..." or "From what was covered..."
✓ Add context like "This was mentioned during the budget review section"
✓ Use professional language: "Let me provide you with the details" 
✓ Show thoroughness: "I've reviewed the transcript and found..."
✓ Offer additional help: "Is there anything specific about [topic] you'd like me to clarify?"
✓ Use confident language: "The information shows..." rather than "It seems like..."

ENHANCED PROFESSIONAL EXAMPLES:

• Complete answer with proactive support:
"[CHATBOT_RESPONSE]: I can help you with that information. According to the CEO's remarks during the quarterly update, profits increased by 15% compared to last quarter, reaching $2.3 million. The CEO specifically attributed this growth to improved operational efficiency and the new product line launch. Would you like me to provide more details about the factors that contributed to this increase?"

• Partial information with helpful guidance:
"[CHATBOT_RESPONSE]: I found some relevant information for you. The transcript discusses budget allocations during the planning meeting, mentioning a total departmental budget of $500K. However, the specific breakdown for marketing wasn't detailed in this particular discussion. The conversation did reference that marketing priorities will be finalized in next week's follow-up meeting. Would you like me to share what other departmental allocations were mentioned?"

• Related information with professional insight:
"[CHATBOT_RESPONSE]: While the transcript doesn't include specific employee satisfaction scores, I did find relevant information about employee feedback initiatives. The HR director mentioned implementing quarterly pulse surveys and reported that initial feedback has been 'overwhelmingly positive' regarding the new flexible work policy. There was also discussion about expanding the employee recognition program. Would you like me to provide more details about these employee engagement initiatives?"

• No information with helpful alternatives:
"[CHATBOT_RESPONSE]: I understand you're looking for information about the Q4 marketing campaign details. After reviewing the transcript thoroughly, I don't see specific details about Q4 marketing plans in this particular discussion. However, the conversation does cover Q3 performance metrics, upcoming product launches, and budget allocations that might be relevant to your planning. The transcript also mentions that detailed Q4 strategies will be presented in the next board meeting. Would you like me to share the Q3 results or budget information that was discussed?"

• Clarification request with professional service:
"[CHATBOT_RESPONSE]: I want to make sure I provide you with the most accurate information. The transcript contains several references to budget discussions across different departments and time periods. To give you the most relevant details, could you help me narrow this down? Are you looking for information about the annual budget planning, the Q3 budget review, or the emergency budget adjustments that were discussed? I have detailed information on each of these topics and want to ensure I address exactly what you need."

QUALITY INDICATORS:
- Every response should feel like speaking with a knowledgeable colleague
- Users should feel heard and supported, not just given data
- Responses should build user confidence in the information provided
- Include forward-thinking suggestions when appropriate
- Maintain professional warmth throughout all interactions`
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
const userTaskDescription = `You are an intelligent assistant tasked with answering questions based on the provided transcript. Use your analytical skills to extract, infer, and synthesize information effectively.

RESPONSE STRATEGY (in order of preference):
1. **DIRECT ANSWER**: If information is explicitly stated in the transcript, provide a complete answer with relevant context.

2. **INFERRED ANSWER**: If the exact answer isn't stated but can be reasonably deduced from available information, provide the inference with clear indication of your reasoning.

3. **PARTIAL ANSWER**: If only some aspects of the question can be answered, provide what information is available and specify what aspects remain unclear.

4. **CONTEXTUAL GUIDANCE**: If the specific information isn't available, but the transcript contains related information that might help the user, provide that relevant context.

5. **ALTERNATIVE INSIGHTS**: If the direct question cannot be answered, suggest related questions that CAN be answered from the transcript.

6. **LAST RESORT**: Only state "information not available" if absolutely no relevant content exists in the transcript.

ANSWER REQUIREMENTS:
- All responses MUST be in ${transcriptLanguageName}
- Always ground your answers in the transcript content
- When making inferences, use phrases like "based on the context, it appears that..." or "the transcript suggests..."
- Include relevant quotes or paraphrases when helpful
- Be specific about what is directly stated vs. what is inferred
- Maintain accuracy while being as helpful as possible

TRANSCRIPT LANGUAGE: ${transcriptLanguageName}

TRANSCRIPT CONTENT:
"""
${transcript}
"""

USER QUESTION: "${question}"

INSTRUCTIONS: Analyze the transcript thoroughly and provide the most helpful response possible using the strategy outlined above. Prioritize being useful while maintaining accuracy.`;

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