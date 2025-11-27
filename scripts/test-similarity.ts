/**
 * Test semantic similarity system
 *
 * This script allows you to test the similarity calculation between feedback texts
 * without needing to submit actual feedback through the bot.
 *
 * Usage:
 *   npx tsx scripts/test-similarity.ts
 */

import {
  generateEmbedding,
  cosineSimilarity,
  calculateOriginalityScore,
  calculateTimeWeight,
} from "../lib/embeddings";

async function testSimilarity() {
  console.log("=".repeat(70));
  console.log("Semantic Similarity Testing Tool");
  console.log("=".repeat(70));
  console.log();

  // Test cases
  const testCases = [
    {
      name: "Exact Duplicates",
      feedback1: "Great project! Very innovative approach.",
      feedback2: "Great project! Very innovative approach.",
      expectedOriginality: "1-2 (duplicate)",
    },
    {
      name: "Near Duplicates (slight paraphrase)",
      feedback1: "Great project! Very innovative approach.",
      feedback2: "Great project! Really innovative approach.",
      expectedOriginality: "1-3 (very similar)",
    },
    {
      name: "Similar Topic, Different Details",
      feedback1: "The UI is not accessible for screen readers.",
      feedback2: "Accessibility issues with keyboard navigation.",
      expectedOriginality: "4-7 (similar topic)",
    },
    {
      name: "Different Topics",
      feedback1: "Great project! Very innovative approach.",
      feedback2: "The API documentation needs error code examples.",
      expectedOriginality: "8-10 (unique)",
    },
    {
      name: "Technical vs. Design Feedback",
      feedback1: "The database queries are inefficient and need optimization.",
      feedback2: "The color scheme needs better contrast for readability.",
      expectedOriginality: "9-10 (completely different)",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\nTest Case: ${testCase.name}`);
    console.log("-".repeat(70));
    console.log(`Feedback 1: "${testCase.feedback1}"`);
    console.log(`Feedback 2: "${testCase.feedback2}"`);
    console.log(`Expected Originality: ${testCase.expectedOriginality}`);
    console.log();

    try {
      // Generate embeddings
      console.log("  Generating embeddings...");
      const [embedding1, embedding2] = await Promise.all([
        generateEmbedding(testCase.feedback1),
        generateEmbedding(testCase.feedback2),
      ]);

      if (!embedding1 || !embedding2) {
        console.error("  ❌ Failed to generate embeddings");
        continue;
      }

      // Calculate similarity
      const similarity = cosineSimilarity(embedding1, embedding2);
      console.log(
        `  Similarity Score: ${similarity.toFixed(
          4
        )} (0 = different, 1 = identical)`
      );

      // Calculate originality (as if feedback2 is being compared to feedback1)
      const originality = calculateOriginalityScore([similarity]);
      console.log(`  Originality Score: ${originality}/10`);

      // Determine if it matches expectations
      const isGood = checkExpectation(
        originality,
        testCase.expectedOriginality
      );
      console.log(`  Result: ${isGood ? "✅ PASS" : "⚠️ REVIEW"}`);
    } catch (error) {
      console.error("  ❌ Error:", error);
    }
  }

  console.log();
  console.log("=".repeat(70));
  console.log("Time Weight Testing");
  console.log("=".repeat(70));
  console.log();

  // Test time weighting
  const now = new Date();
  const timeTests = [
    { days: 0, label: "Today" },
    { days: 1, label: "1 day ago" },
    { days: 7, label: "1 week ago" },
    { days: 30, label: "1 month ago" },
    { days: 90, label: "3 months ago" },
    { days: 365, label: "1 year ago" },
  ];

  for (const test of timeTests) {
    const date = new Date(now.getTime() - test.days * 24 * 60 * 60 * 1000);
    const weight = calculateTimeWeight(date);
    console.log(`${test.label.padEnd(15)} → Weight: ${weight.toFixed(4)}`);
  }

  console.log();
  console.log("=".repeat(70));
  console.log("Weighted Originality Testing");
  console.log("=".repeat(70));
  console.log();

  // Test weighted originality calculation
  console.log("Scenario: Multiple similar feedback at different times");
  console.log();

  const similarities = [0.9, 0.85, 0.8, 0.75]; // 4 similar feedback
  const dates = [
    new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
    new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
  ];
  const weights = dates.map((d) => calculateTimeWeight(d));

  console.log("Similar Feedback:");
  for (let i = 0; i < similarities.length; i++) {
    console.log(
      `  ${i + 1}. Similarity: ${similarities[i].toFixed(2)}, Age: ${dates[
        i
      ].toLocaleDateString()}, Weight: ${weights[i].toFixed(3)}`
    );
  }
  console.log();

  const weightedOriginality = calculateOriginalityScore(similarities, weights);
  const uniformOriginality = calculateOriginalityScore(similarities);

  console.log(
    `Weighted Originality Score: ${weightedOriginality}/10 (considers recency)`
  );
  console.log(
    `Uniform Originality Score: ${uniformOriginality}/10 (ignores recency)`
  );
  console.log();
  console.log(
    "Note: Weighted scoring gives more importance to recent feedback,"
  );
  console.log(
    "      so similar recent feedback lowers the originality score more."
  );

  console.log();
  console.log("=".repeat(70));
  console.log("Testing Complete");
  console.log("=".repeat(70));
}

function checkExpectation(score: number, expected: string): boolean {
  // Parse expected range (e.g., "1-3" or "8-10")
  const match = expected.match(/(\d+)-(\d+)/);
  if (!match) return true; // If can't parse, just show result

  const min = parseInt(match[1]);
  const max = parseInt(match[2]);

  return score >= min && score <= max;
}

// Run the tests
testSimilarity()
  .then(() => {
    console.log("\nAll tests completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nTest script failed:", error);
    process.exit(1);
  });
