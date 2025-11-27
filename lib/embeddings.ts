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
 * Calculate originality score from similarity values
 * Lower similarity = higher originality
 *
 * @param similarities Array of similarity scores (0-1) from semantic search
 * @returns Originality score from 1-10
 */
export function calculateOriginalityScore(similarities: number[]): number {
  if (similarities.length === 0) {
    // No existing feedback to compare against - perfectly original
    return 10;
  }

  // Use the highest similarity (most similar item) as the primary indicator
  // This is simpler and more effective than weighted averages
  const maxSimilarity = Math.max(...similarities);

  // Convert similarity to originality score
  // High similarity (e.g., 0.9) -> Low originality (e.g., 1)
  // Low similarity (e.g., 0.1) -> High originality (e.g., 10)

  // Use a non-linear scale to be more sensitive to high similarity
  // This helps catch potential farming/duplicate feedback
  let originality: number;

  if (maxSimilarity >= 0.95) {
    // Almost identical - likely spam/farming
    originality = 1;
  } else if (maxSimilarity >= 0.85) {
    // Very similar - minimal originality
    originality = 1 + (0.95 - maxSimilarity) * 20; // 1-3 range
  } else if (maxSimilarity >= 0.7) {
    // Similar - low originality
    originality = 3 + (0.85 - maxSimilarity) * 20; // 3-6 range
  } else if (maxSimilarity >= 0.5) {
    // Somewhat similar - moderate originality
    originality = 6 + (0.7 - maxSimilarity) * 15; // 6-9 range
  } else {
    // Quite different - high originality
    originality = 9 + (0.5 - maxSimilarity) * 2; // 9-10 range
  }

  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, Math.round(originality)));
}
