# Semantic Originality Scoring System

## Overview

The FBI Agent Bot now uses a **semantic similarity-based approach** to calculate originality scores for feedback, replacing the previous AI-based scoring method. This provides more accurate and consistent detection of duplicate or similar feedback.

## How It Works

### 1. Embedding Generation

When a user submits feedback:

- The feedback text is converted into a **1536-dimensional vector** (embedding) using OpenAI's `text-embedding-3-small` model
- This embedding captures the semantic meaning of the feedback
- The embedding is stored in the `content_embedding` column of the `feedback` table

### 2. Semantic Similarity Search

Before scoring new feedback:

- The system retrieves all existing feedback embeddings for the same project
- It calculates **cosine similarity** between the new feedback and each existing feedback
- Cosine similarity ranges from -1 to 1, where 1 means identical content

### 3. Time-Weighted Scoring

Not all similar feedback is treated equally:

- **Recent feedback** has higher weight (more impact on similarity)
- **Older feedback** has lower weight (less impact)
- Uses exponential decay: `weight = e^(-age/decayFactor)`
- Default decay factor: 30 days (feedback loses ~50% weight after 30 days)
- Minimum weight: 0.1 (old feedback still matters, just less)

### 4. Originality Score Calculation

The weighted average similarity is converted to an originality score (1-10):

| Similarity Range | Originality Score | Interpretation                          |
| ---------------- | ----------------- | --------------------------------------- |
| ≥ 0.95           | 1                 | Almost identical (likely spam/farming)  |
| 0.85 - 0.95      | 1-3               | Very similar (minimal originality)      |
| 0.70 - 0.85      | 3-6               | Similar (low originality)               |
| 0.50 - 0.70      | 6-9               | Somewhat similar (moderate originality) |
| < 0.50           | 9-10              | Quite different (high originality)      |

### 5. Score Formula

```
If no existing feedback: originality = 10

Otherwise:
1. Calculate similarities: [s1, s2, s3, ...]
2. Calculate weights: [w1, w2, w3, ...]
3. Weighted average: avgSim = Σ(si × wi) / Σ(wi)
4. Convert to originality using non-linear scale
5. Clamp to range [1, 10]
```

## Database Schema

### New Column

```sql
ALTER TABLE public.feedback
ADD COLUMN content_embedding vector(1536);
```

### New Index

```sql
CREATE INDEX feedback_content_embedding_idx
ON public.feedback
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);
```

This index uses **IVFFlat** (Inverted File with Flat Compression) for fast approximate nearest neighbor search.

## Migration Guide

### For New Installations

The schema in `supabase_schema.sql` already includes the vector column and index. Just run:

```bash
psql -d your_database < supabase_schema.sql
```

### For Existing Installations

1. **Run the migration:**

   ```bash
   psql -d your_database < migrations/add_feedback_embeddings.sql
   ```

2. **Backfill embeddings for existing feedback:**

   ```bash
   npx tsx scripts/backfill-embeddings.ts
   ```

   This will:

   - Find all feedback without embeddings
   - Generate embeddings for each one
   - Update the database
   - Show progress and statistics

## Code Structure

### New Module: `lib/embeddings.ts`

Contains all embedding and similarity functions:

- `generateEmbedding(text)` - Creates embedding vector
- `cosineSimilarity(vecA, vecB)` - Calculates similarity
- `calculateOriginalityScore(similarities, weights)` - Converts similarity to score
- `calculateTimeWeight(createdAt)` - Calculates time-based weight

### Updated Modules

**`lib/ai.ts`**

- Removed `originality` from `FeedbackScore` interface
- AI no longer scores originality

**`lib/prompts.ts`**

- Removed originality criteria from the prompt
- Added note that originality is evaluated separately

**`lib/supabase.ts`**

- Added `content_embedding` to `createFeedback()`
- Added `getFeedbackEmbeddingsByProjectId()` - retrieves embeddings for comparison
- Added `updateFeedbackEmbedding()` - stores embedding after generation

**`lib/bot/handlers/message.ts`**

- Now generates embeddings when feedback is received
- Performs semantic search against existing feedback
- Calculates originality score based on similarity
- Stores both embedding and originality score

## Performance Considerations

### Embedding Generation

- Uses OpenAI's `text-embedding-3-small` model
- ~$0.02 per 1M tokens (very cheap)
- Fast: ~100ms per request
- Rate limit: Handle with exponential backoff

### Similarity Search

- O(n) time complexity for n feedback items per project
- Optimized with IVFFlat index for large datasets
- Most projects will have < 100 feedback items (< 10ms search)

### Parallelization

The system runs three operations in parallel:

1. AI analysis (relevance, depth, evidence, constructiveness, tone)
2. Embedding generation
3. Fetching existing embeddings

This minimizes total latency.

## Testing

### Manual Testing

1. Submit feedback to a project:

   ```
   "Great project! Very innovative approach."
   ```

2. Submit similar feedback:

   ```
   "Great project! Really innovative approach."
   ```

   Expected: Low originality score (1-3)

3. Submit different feedback:
   ```
   "The UI needs better contrast ratios for accessibility. Consider WCAG 2.1 AA standards."
   ```
   Expected: High originality score (8-10)

### Check Logs

The message handler logs:

```
Originality score: 2 (based on 5 comparisons)
Top similarities: 0.927, 0.842, 0.781
```

## Benefits

### Accuracy

- Detects semantic similarity, not just exact text matches
- Catches paraphrased or slightly modified duplicate feedback

### Consistency

- Deterministic scoring (same input = same output)
- Not affected by AI model temperature or variations

### Scalability

- O(n) comparison per project (not O(n²))
- Efficient vector search with IVFFlat index
- Lower cost than AI-based scoring

### Transparency

- Clear mathematical formula
- Easy to debug and adjust thresholds
- Explainable to users

## Future Improvements

### Possible Enhancements

1. **Cross-project similarity detection**

   - Detect users copying feedback across projects
   - Requires global embedding search

2. **Clustering similar feedback**

   - Group similar feedback for summarization
   - Helps identify common themes

3. **Adaptive thresholds**

   - Adjust similarity thresholds based on project type
   - Technical feedback vs. design feedback may need different thresholds

4. **Multi-language support**

   - Embeddings work across languages
   - Could support international users

5. **Fine-tuned embeddings**
   - Train custom embedding model on feedback data
   - Could improve similarity detection for domain-specific terms

## Troubleshooting

### Embeddings not being generated

Check:

- `OPENAI_API_KEY` environment variable is set
- OpenAI API has credits
- Network connectivity
- Logs for error messages

### Low originality scores for unique feedback

Adjust thresholds in `lib/embeddings.ts`:

```typescript
// Make scoring more lenient
if (avgSimilarity >= 0.85) {
  // was 0.95
  originality = 1;
}
```

### High originality scores for duplicate feedback

Check:

- Embeddings are being stored correctly
- `getFeedbackEmbeddingsByProjectId()` is returning data
- Similarity calculation is working (check logs)

### Index not being used

The IVFFlat index requires training data:

- Need at least ~1000 rows with embeddings for optimal performance
- For smaller datasets, sequential scan is fine and fast enough

Run `EXPLAIN ANALYZE` to verify:

```sql
EXPLAIN ANALYZE
SELECT id, content_embedding <=> '[...]' as distance
FROM feedback
ORDER BY distance
LIMIT 10;
```

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Cosine Similarity](https://en.wikipedia.org/wiki/Cosine_similarity)
- [IVFFlat Algorithm](https://arxiv.org/abs/1702.08734)
