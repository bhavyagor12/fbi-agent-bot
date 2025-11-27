# Deployment Checklist: Semantic Originality Scoring

Use this checklist to deploy the new semantic originality scoring system.

## Pre-Deployment

- [ ] **Verify OpenAI API Key**
  ```bash
  echo $OPENAI_API_KEY
  ```
  Make sure it's set and has credits available.

- [ ] **Verify Supabase Connection**
  ```bash
  echo $NEXT_PUBLIC_SUPABASE_URL
  echo $NEXT_PUBLIC_SUPABASE_SERVICE_KEY
  ```

- [ ] **Check pgvector Extension**
  ```sql
  SELECT * FROM pg_extension WHERE extname = 'vector';
  ```
  Should show the vector extension is installed.

## Database Migration

### Step 1: Backup Database (IMPORTANT!)
```bash
pg_dump -d your_database > backup_before_embeddings_$(date +%Y%m%d).sql
```

### Step 2: Run Migration
```bash
psql -d your_database < migrations/add_feedback_embeddings.sql
```

### Step 3: Verify Schema Changes
```sql
-- Check column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'feedback' AND column_name = 'content_embedding';

-- Check index was created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'feedback' AND indexname = 'feedback_content_embedding_idx';
```

## Code Deployment

- [ ] **Install Dependencies** (if any new packages)
  ```bash
  npm install
  ```

- [ ] **Build Application**
  ```bash
  npm run build
  ```

- [ ] **Run Tests** (if you have tests)
  ```bash
  npm test
  ```

- [ ] **Deploy Application**
  ```bash
  # Your deployment command (e.g., Vercel, Docker, etc.)
  npm run deploy
  # OR
  vercel --prod
  # OR
  docker-compose up -d
  ```

## Post-Deployment

### Step 1: Test Similarity System (Optional but Recommended)
```bash
npx tsx scripts/test-similarity.ts
```

Expected output:
- Should show similarity scores for different feedback pairs
- Should calculate originality scores
- Should demonstrate time weighting

### Step 2: Backfill Existing Feedback
```bash
npx tsx scripts/backfill-embeddings.ts
```

This will:
- Generate embeddings for all existing feedback
- Show progress and statistics
- Handle rate limiting automatically

**Important:** This may take a while if you have many feedback entries. The script includes rate limiting to avoid API issues.

### Step 3: Monitor First Few Feedback Submissions

Watch logs for:
```
Originality score: X (based on N comparisons)
Top similarities: 0.927, 0.842, 0.781
```

### Step 4: Test Live Feedback

1. **Submit new feedback** to a project via Telegram
2. **Submit similar feedback** to the same project
3. **Check database** to verify:
   - `content_embedding` column is populated
   - `score_originality` is calculated correctly
   - Similar feedback gets low originality scores

```sql
SELECT 
  id, 
  content, 
  score_originality,
  content_embedding IS NOT NULL as has_embedding
FROM feedback 
ORDER BY created_at DESC 
LIMIT 10;
```

## Rollback Plan (If Something Goes Wrong)

### If Migration Fails
```bash
# Restore from backup
psql -d your_database < backup_before_embeddings_YYYYMMDD.sql
```

### If Code Has Issues
```bash
# Revert git changes
git checkout main  # or your previous stable branch
git pull origin main

# Redeploy
npm run deploy
```

### Database is OK but Code Fails
The migration is backward compatible:
- Old code will ignore the `content_embedding` column
- No data loss will occur
- You can fix code and redeploy

## Verification Checklist

After deployment, verify:

- [ ] New feedback receives originality scores (1-10)
- [ ] Similar feedback gets low originality scores (1-3)
- [ ] Unique feedback gets high originality scores (8-10)
- [ ] Embeddings are stored in the database
- [ ] XP calculation includes originality score
- [ ] No errors in application logs
- [ ] Bot responds normally to feedback

## Performance Monitoring

Monitor these metrics:

### API Usage
- OpenAI API calls per day
- Average embedding generation time
- API error rate

### Database Performance
- Average similarity search time
- Index usage statistics
- Storage size increase (embeddings add ~6KB per feedback)

### Application Health
- Bot response time
- Error rates in logs
- User feedback quality scores

## Troubleshooting

### High Originality for Duplicate Feedback

**Symptoms:** Similar feedback gets 8-10 originality score

**Possible Causes:**
1. Embeddings not being stored correctly
2. Similarity search returning empty results
3. Wrong project_id in comparison

**Solution:**
```sql
-- Check if embeddings are being stored
SELECT COUNT(*) FROM feedback WHERE content_embedding IS NOT NULL;

-- Check if multiple feedback exist for project
SELECT project_id, COUNT(*) 
FROM feedback 
WHERE content_embedding IS NOT NULL 
GROUP BY project_id;
```

### Low Originality for Unique Feedback

**Symptoms:** Unique feedback gets 1-3 originality score

**Possible Causes:**
1. Thresholds too strict
2. Similar project context triggering false positives

**Solution:**
Adjust thresholds in `lib/embeddings.ts`:
```typescript
if (avgSimilarity >= 0.90) {  // Raised from 0.95
    originality = 1;
}
```

### Embeddings Not Being Generated

**Symptoms:** `content_embedding` is always NULL

**Possible Causes:**
1. OpenAI API key missing or invalid
2. Network issues
3. Rate limiting

**Solution:**
```bash
# Check API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check logs for errors
tail -f logs/application.log | grep embedding
```

### Slow Feedback Processing

**Symptoms:** Bot takes too long to respond

**Possible Causes:**
1. Too many existing feedback to compare
2. Database query not using index
3. API timeout

**Solution:**
```sql
-- Check index is being used
EXPLAIN ANALYZE
SELECT content_embedding 
FROM feedback 
WHERE project_id = 1 
AND content_embedding IS NOT NULL;
```

## Success Criteria

✅ **Deployment is successful if:**

1. All existing feedback has embeddings (after backfill)
2. New feedback automatically gets embeddings and originality scores
3. Similar feedback gets low originality scores (1-3)
4. Unique feedback gets high originality scores (8-10)
5. No increase in error rates
6. Bot response time remains acceptable (<2 seconds)
7. XP calculation includes originality component

## Support

If you encounter issues:

1. Check `docs/SEMANTIC_ORIGINALITY_SCORING.md` for detailed documentation
2. Review logs for error messages
3. Verify environment variables are set
4. Test with `scripts/test-similarity.ts`
5. Check database with SQL queries above

## Next Steps After Successful Deployment

- [ ] Monitor for 24-48 hours
- [ ] Analyze originality score distribution
- [ ] Adjust thresholds if needed
- [ ] Consider implementing additional enhancements (see docs)
- [ ] Update user documentation about feedback quality

---

**Estimated Time:** 30-60 minutes (plus backfill time)

**Required Downtime:** None (migration is backward compatible)

**Risk Level:** Low (can rollback easily)

