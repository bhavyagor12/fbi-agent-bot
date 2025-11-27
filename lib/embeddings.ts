import OpenAI from 'openai';

/**
 * Generate an embedding vector for text using OpenAI's embedding model
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('OPENAI_API_KEY is not set');
            return null;
        }
        
        const openai = new OpenAI({ apiKey });
        
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate originality score from similarity values
 * Lower similarity = higher originality
 * 
 * @param similarities Array of similarity scores (0-1) from semantic search
 * @param weights Array of weights for each similarity (e.g., based on recency)
 * @returns Originality score from 1-10
 */
export function calculateOriginalityScore(
    similarities: number[],
    weights?: number[]
): number {
    if (similarities.length === 0) {
        // No existing feedback to compare against - perfectly original
        return 10;
    }
    
    // If no weights provided, use uniform weights
    const effectiveWeights = weights || similarities.map(() => 1);
    
    // Calculate weighted average similarity
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < similarities.length; i++) {
        weightedSum += similarities[i] * effectiveWeights[i];
        totalWeight += effectiveWeights[i];
    }
    
    const avgSimilarity = weightedSum / totalWeight;
    
    // Convert similarity to originality score
    // High similarity (e.g., 0.9) -> Low originality (e.g., 1)
    // Low similarity (e.g., 0.1) -> High originality (e.g., 10)
    
    // Use a non-linear scale to be more sensitive to high similarity
    // This helps catch potential farming/duplicate feedback
    let originality: number;
    
    if (avgSimilarity >= 0.95) {
        // Almost identical - likely spam/farming
        originality = 1;
    } else if (avgSimilarity >= 0.85) {
        // Very similar - minimal originality
        originality = 1 + (0.95 - avgSimilarity) * 20; // 1-3 range
    } else if (avgSimilarity >= 0.70) {
        // Similar - low originality
        originality = 3 + (0.85 - avgSimilarity) * 20; // 3-6 range
    } else if (avgSimilarity >= 0.50) {
        // Somewhat similar - moderate originality
        originality = 6 + (0.70 - avgSimilarity) * 15; // 6-9 range
    } else {
        // Quite different - high originality
        originality = 9 + (0.50 - avgSimilarity) * 2; // 9-10 range
    }
    
    // Clamp to 1-10 range
    return Math.max(1, Math.min(10, Math.round(originality)));
}

/**
 * Calculate time-based weight for similarity comparison
 * More recent feedback should have higher weight
 * 
 * @param createdAt Date when the feedback was created
 * @param decayFactor How quickly weight decreases (default: 30 days for 50% weight)
 * @returns Weight between 0.1 and 1.0
 */
export function calculateTimeWeight(
    createdAt: Date,
    decayFactor: number = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
): number {
    const now = new Date().getTime();
    const then = new Date(createdAt).getTime();
    const age = now - then;
    
    // Exponential decay: weight = e^(-age/decayFactor)
    // Minimum weight of 0.1 to ensure old feedback still matters
    const weight = Math.max(0.1, Math.exp(-age / decayFactor));
    
    return weight;
}

