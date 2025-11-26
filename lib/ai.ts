import { GoogleGenerativeAI } from '@google/generative-ai';
import { FEEDBACK_ANALYSIS_PROMPT } from './prompts';

export interface FeedbackScore {
    relevance: number;
    depth: number;
    evidence: number;
    constructiveness: number;
    tone: number;
    summary: string;
}

export async function analyzeFeedback(
    feedbackText: string,
    projectContext: string,
    hasMedia: boolean
): Promise<FeedbackScore | null> {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            console.error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
            return null;
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = FEEDBACK_ANALYSIS_PROMPT(projectContext, feedbackText, hasMedia);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        console.log("HERER", text)
        // Clean up code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        console.log(cleanText)
        return JSON.parse(cleanText) as FeedbackScore;
    } catch (error) {
        console.error('Error analyzing feedback:', error);
        return null;
    }
}
