import { NextResponse } from "next/server";
import { analyzeFeedback } from "@/lib/ai";
import { generateEmbedding, isFeedbackOriginal } from "@/lib/embeddings";

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {},
    envVars: {
      OPENAI_FBI_KEY: !!process.env.OPENAI_FBI_KEY,
      TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
  };

  const testFeedback =
    "This is a great project! I love the design and the user experience is smooth. However, I think the loading time could be improved.";
  const projectContext = "A web application for managing tasks";

  // Test 1: AI Analysis
  try {
    console.log("Testing AI Analysis...");
    const scores = await analyzeFeedback(testFeedback, projectContext, false);
    if (scores) {
      results.tests.aiAnalysis = {
        status: "SUCCESS",
        scores: scores,
      };
    } else {
      results.tests.aiAnalysis = {
        status: "FAILED",
        error: "Returned null",
      };
    }
  } catch (error: any) {
    results.tests.aiAnalysis = {
      status: "ERROR",
      error: error.message,
      stack: error.stack,
    };
  }

  // Test 2: Embedding Generation
  try {
    console.log("Testing Embedding Generation...");
    const embedding = await generateEmbedding(testFeedback);
    if (embedding) {
      results.tests.embeddingGeneration = {
        status: "SUCCESS",
        embeddingLength: embedding.length,
      };
    } else {
      results.tests.embeddingGeneration = {
        status: "FAILED",
        error: "Returned null",
      };
    }
  } catch (error: any) {
    results.tests.embeddingGeneration = {
      status: "ERROR",
      error: error.message,
      stack: error.stack,
    };
  }

  // Test 3: Originality Check
  try {
    const similarityScores = [0.95, 0.82, 0.67, 0.45, 0.32];
    const isOriginal = isFeedbackOriginal(similarityScores);
    results.tests.originalityCheck = {
      status: "SUCCESS",
      isOriginal: isOriginal,
      maxSimilarity: Math.max(...similarityScores),
    };
  } catch (error: any) {
    results.tests.originalityCheck = {
      status: "ERROR",
      error: error.message,
    };
  }

  return NextResponse.json(results, { status: 200 });
}
