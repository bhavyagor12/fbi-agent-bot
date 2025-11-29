import OpenAI from "openai";
import { FEEDBACK_ANALYSIS_PROMPT, FEEDBACK_SUMMARY_PROMPT } from "./prompts";

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

export async function summarizeFeedback(
  feedbackItems: Array<{ content: string; media_url?: string | null }>
): Promise<string | null> {
  try {
    const apiKey = process.env.OPENAI_FBI_KEY;
    if (!apiKey) {
      console.error("OPENAI_FBI_KEY is not set");
      return null;
    }
    const openai = new OpenAI({ apiKey });

    // Format feedback items for the prompt
    const formattedFeedback = feedbackItems.map((item) => ({
      content: item.content || "",
      hasMedia: !!item.media_url,
    }));

    const prompt = FEEDBACK_SUMMARY_PROMPT(formattedFeedback);

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      console.error("No response from OpenAI");
      return null;
    }

    // Clean up any markdown or code blocks if present
    const cleanText = text
      .replace(/```/g, "")
      .replace(/json/g, "")
      .trim();
    
    return cleanText;
  } catch (error) {
    console.error("Error summarizing feedback:", error);
    return null;
  }
}
