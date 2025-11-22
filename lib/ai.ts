import { GoogleGenerativeAI } from '@google/generative-ai';
import { FEEDBACK_ANALYSIS_PROMPT } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = FEEDBACK_ANALYSIS_PROMPT(projectContext, feedbackText, hasMedia);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanText) as FeedbackScore;
    } catch (error) {
        console.error('Error analyzing feedback:', error);
        return null;
    }
}
