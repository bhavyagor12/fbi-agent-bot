# Semantic Originality Scoring Implementation Summary

## What Changed

Replaced AI-based originality scoring with a semantic similarity-based approach using vector embeddings and cosine similarity.

## Files Modified

### 1. Database Schema

**File:** `supabase_schema.sql`

- Added `content_embedding vector(1536)` column to feedback table
- Added IVFFlat index for efficient vector similarity search

### 2. New Module: Embeddings

**File:** `lib/embeddings.ts` (NEW)

- `generateEmbedding()` - Creates embeddings using OpenAI
- `cosineSimilarity()` - Calculates similarity between vectors
- `calculateOriginalityScore()` - Converts similarity to 1-10 score
- `calculateTimeWeight()` - Time-based weighting for recent feedback

### 3. AI Module

**File:** `lib/ai.ts`

- Removed `originality` field from `FeedbackScore` interface

### 4. Prompts

**File:** `lib/prompts.ts`

- Removed originality criteria from feedback analysis prompt
- Added note about separate originality evaluation

### 5. Supabase Functions

**File:** `lib/supabase.ts`

- Updated `createFeedback()` to accept `content_embedding`
- Added `getFeedbackEmbeddingsByProjectId()` for semantic search
- Added `updateFeedbackEmbedding()` to store embeddings

### 6. Message Handler

**File:** `lib/bot/handlers/message.ts`

- Generates embeddings when feedback is received
- Performs semantic search against existing project feedback
- Calculates originality based on weighted similarity
- Stores embedding and originality score

### 7. Migration Script

**File:** `migrations/add_feedback_embeddings.sql` (NEW)

- SQL migration to add vector column to existing databases
- Creates index after column addition

### 8. Backfill Script

**File:** `scripts/backfill-embeddings.ts` (NEW)

- Generates embeddings for existing feedback
- Progress tracking and error handling
- Rate limiting to avoid API issues

### 9. Documentation

**File:** `docs/SEMANTIC_ORIGINALITY_SCORING.md` (NEW)

- Complete technical documentation
- Migration guide
- Troubleshooting tips

## How to Deploy

### For New Installations

```bash
# Schema already includes vector column
psql -d your_database < supabase_schema.sql
```

### For Existing Installations

1. **Run migration:**

   ```bash
   psql -d your_database < migrations/add_feedback_embeddings.sql
   ```

2. **Backfill existing feedback:**

   ```bash
   npx tsx scripts/backfill-embeddings.ts
   ```

3. **Restart the bot:**
   ```bash
   # Your deployment command
   npm run deploy
   ```

## Environment Variables Required

Ensure these are set:

- `OPENAI_API_KEY` - For generating embeddings
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase instance
- `NEXT_PUBLIC_SUPABASE_SERVICE_KEY` - Supabase service role key

## Key Benefits

1. **More Accurate** - Detects semantic similarity, not just exact matches
2. **Consistent** - Deterministic scoring (same input = same output)
3. **Cost-effective** - Embeddings are cheaper than AI analysis
4. **Scalable** - Efficient vector search with indexing
5. **Transparent** - Clear mathematical formula, easy to debug

## Originality Scoring Logic

```
High Similarity (≥0.95) → Low Originality (1-3)   [Likely spam/duplicate]
Medium Similarity (0.70-0.85) → Medium Originality (3-6)
Low Similarity (<0.50) → High Originality (9-10)  [Unique feedback]
```

Time weighting ensures recent feedback has more influence than old feedback.

## Testing

### Test Case 1: Duplicate Feedback

```
Feedback 1: "Great project! Very innovative."
Feedback 2: "Great project! Really innovative."
Expected: Originality score 1-3
```

### Test Case 2: Unique Feedback

```
Feedback 1: "Great project! Very innovative."
Feedback 2: "The API documentation needs error code examples."
Expected: Originality score 8-10
```

### Test Case 3: Similar But Different

```
Feedback 1: "The UI is not accessible."
Feedback 2: "Accessibility issues with screen readers."
Expected: Originality score 4-7
```

## Monitoring

Check logs for:

```
Originality score: X (based on N comparisons)
Top similarities: 0.927, 0.842, 0.781
```

This helps debug and tune the system.

## Future Enhancements

- Cross-project similarity detection
- Feedback clustering and summarization
- Adaptive thresholds per project type
- Multi-language support
- Custom fine-tuned embedding models

## Support

For issues or questions:

1. Check `docs/SEMANTIC_ORIGINALITY_SCORING.md` for detailed documentation
2. Review logs for error messages
3. Verify OpenAI API key and credits
4. Check Supabase connection and permissions
