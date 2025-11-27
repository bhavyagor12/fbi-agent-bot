import OpenAI from "openai";
import { FEEDBACK_ANALYSIS_PROMPT } from "./prompts";

export interface FeedbackScore {
  relevance: number;
  depth: number;
  evidence: number;
  constructiveness: number;
  tone: number;
}

export async function analyzeFeedback(
  feedbackText: string,
  projectContext: string,
  hasMedia: boolean
): Promise<FeedbackScore | null> {
  try {
    const apiKey = process.env.OPENAI_FBI_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set");
      return null;
    }
    const openai = new OpenAI({ apiKey });

    const prompt = FEEDBACK_ANALYSIS_PROMPT(
      projectContext,
      feedbackText,
      hasMedia
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      console.error("No response from OpenAI");
      return null;
    }

    // Clean up code blocks if present
    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    console.log(cleanText);
    return JSON.parse(cleanText) as FeedbackScore;
  } catch (error) {
    console.error("Error analyzing feedback:", error);
    return null;
  }
}
