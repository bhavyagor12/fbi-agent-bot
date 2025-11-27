/**
 * Backfill embeddings for existing feedback
 *
 * This script generates embeddings for all feedback entries that don't have one yet.
 * Run this after migrating the database schema to add the content_embedding column.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts
 */

import { supabaseServer } from "../lib/supabase";
import { generateEmbedding } from "../lib/embeddings";

async function backfillEmbeddings() {
  console.log("Starting embedding backfill process...\n");

  // Get all feedback without embeddings
  const { data: feedbackList, error } = await supabaseServer
    .from("feedback")
    .select("id, content, project_id")
    .is("content_embedding", null)
    .not("content", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching feedback:", error);
    return;
  }

  if (!feedbackList || feedbackList.length === 0) {
    console.log("No feedback entries need embeddings. All done!");
    return;
  }

  console.log(
    `Found ${feedbackList.length} feedback entries without embeddings.\n`
  );

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const feedback of feedbackList) {
    if (!feedback.content || feedback.content.trim().length === 0) {
      console.log(
        `[${processed + 1}/${feedbackList.length}] Skipping feedback ${
          feedback.id
        } (empty content)`
      );
      skipped++;
      processed++;
      continue;
    }

    try {
      console.log(
        `[${processed + 1}/${feedbackList.length}] Processing feedback ${
          feedback.id
        }...`
      );

      // Generate embedding
      const embedding = await generateEmbedding(feedback.content);

      if (!embedding) {
        console.error(
          `  ❌ Failed to generate embedding for feedback ${feedback.id}`
        );
        failed++;
        processed++;
        continue;
      }

      // Update feedback with embedding
      const { error: updateError } = await supabaseServer
        .from("feedback")
        .update({ content_embedding: embedding })
        .eq("id", feedback.id);

      if (updateError) {
        console.error(
          `  ❌ Failed to update feedback ${feedback.id}:`,
          updateError.message
        );
        failed++;
      } else {
        console.log(
          `  ✅ Successfully added embedding for feedback ${feedback.id}`
        );
      }

      processed++;

      // Add a small delay to avoid rate limiting
      if (processed % 10 === 0) {
        console.log(
          `\nProgress: ${processed}/${feedbackList.length} processed (${failed} failed, ${skipped} skipped)\n`
        );
        // Wait 1 second every 10 requests to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ❌ Error processing feedback ${feedback.id}:`, error);
      failed++;
      processed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Backfill complete!");
  console.log(`Total processed: ${processed}`);
  console.log(`Successful: ${processed - failed - skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log("=".repeat(60));
}

// Run the backfill
backfillEmbeddings()
  .then(() => {
    console.log("\nScript completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nScript failed with error:", error);
    process.exit(1);
  });
