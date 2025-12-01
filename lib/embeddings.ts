import OpenAI from "openai";

/**
 * Generate an embedding vector for text using OpenAI's embedding model
 */
export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  try {
    const apiKey = process.env.OPENAI_FBI_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set");
      return null;
    }
    const openai = new OpenAI({ apiKey });

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

/**
 * Check if feedback is original based on similarity values
 * Returns false if feedback is too similar to existing feedback (should cut XP)
 *
 * @param similarities Array of similarity scores (0-1) from semantic search
 * @returns true if original, false if too similar (should cut XP)
 */
export function isFeedbackOriginal(similarities: number[]): boolean {
  if (similarities.length === 0) {
    // No existing feedback to compare against - perfectly original
    return true;
  }

  // Use the highest similarity (most similar item) as the primary indicator
  const maxSimilarity = Math.max(...similarities);

  // If similarity is >= 0.85, consider it not original (cut XP)
  // This threshold catches duplicate/farming feedback
  return maxSimilarity < 0.85;
}
