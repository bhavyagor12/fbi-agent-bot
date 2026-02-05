/**
 * First Dollar API Integration
 *
 * This module handles integration with the First Dollar app API
 * to check user onchain scores based on their Telegram username.
 */

export interface FirstDollarUserScore {
  username: string;
  score: number;
  threshold: number;
}

const FIRST_DOLLAR_ONCHAIN_SCORE_URL =
  "https://app.firstdollar.money/api/onchain-score";

// Default threshold - can be overridden by API response
const DEFAULT_THRESHOLD = 50;

/**
 * Fetches a user's onchain score from the First Dollar API
 *
 * @param telegramUsername - The user's Telegram username (without @)
 * @returns User score data including score and threshold, or null if user not found
 */
export async function getFirstDollarScore(
  telegramUsername: string | undefined
): Promise<FirstDollarUserScore> {
  if (!telegramUsername) {
    console.log("[FirstDollar] No username provided, treating as score 0");
    return {
      username: "unknown",
      score: 0,
      threshold: DEFAULT_THRESHOLD,
    };
  }

  const cleanUsername = telegramUsername.replace(/^@/, "").trim();
  if (!cleanUsername) {
    console.log("[FirstDollar] Empty username provided, treating as score 0");
    return {
      username: "unknown",
      score: 0,
      threshold: DEFAULT_THRESHOLD,
    };
  }

  try {
    console.log(`[FirstDollar] Checking onchain score for user: ${cleanUsername}`);

    const response = await fetch(FIRST_DOLLAR_ONCHAIN_SCORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_username: cleanUsername }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 404) {
      console.log(`[FirstDollar] User ${cleanUsername} not found`);
      // Treat missing users as score 0 so they do not meet the threshold.
      return {
        username: cleanUsername,
        score: 0,
        threshold: DEFAULT_THRESHOLD,
      };
    }

    if (!response.ok) {
      console.error(
        `[FirstDollar] API error ${response.status}:`,
        (data as { error?: string }).error ?? "Request failed"
      );
      return {
        username: cleanUsername,
        score: 0,
        threshold: DEFAULT_THRESHOLD,
      };
    }

    const onchainScore =
      typeof (data as { onchain_score?: number }).onchain_score === "number"
        ? (data as { onchain_score: number }).onchain_score
        : 0;

    return {
      username: cleanUsername,
      score: onchainScore,
      threshold: DEFAULT_THRESHOLD,
    };
  } catch (error) {
    console.error("[FirstDollar] Error fetching user score:", error);
    return {
      username: telegramUsername?.replace(/^@/, "").trim() || "unknown",
      score: 0,
      threshold: DEFAULT_THRESHOLD,
    };
  }
}

/**
 * Checks if a user meets the score threshold to post feedback
 *
 * @param telegramUsername - The user's Telegram username
 * @returns Object with meetsThreshold boolean and score details, or null if check couldn't be performed
 */
export async function checkUserScoreThreshold(
  telegramUsername: string | undefined
): Promise<{
  meetsThreshold: boolean;
  score: number;
  threshold: number;
  username: string;
}> {
  const scoreData = await getFirstDollarScore(telegramUsername);

  return {
    meetsThreshold: scoreData.score >= scoreData.threshold,
    score: scoreData.score,
    threshold: scoreData.threshold,
    username: scoreData.username,
  };
}

/**
 * Generates a DM message explaining why the user was removed from the group
 *
 * @param score - User's current score
 * @param threshold - Required threshold
 * @returns Formatted message for the user
 */
export function generateThresholdDMMessage(score: number, threshold: number): string {
  if (score === 0) {
    // User not registered in First Dollar
    return `You need to be registered on First Dollar to join this group.

To get access:
1. Sign up on First Dollar
2. Build your score to at least ${threshold} through quality contributions
3. Once your score meets the threshold, you can rejoin the group

If you believe this is an error, please contact the administrators.`;
  }

  return `Your First Dollar score (${score}) is below the required threshold (${threshold}).

To increase your score and gain access:
1. Complete more activities on First Dollar
2. Build your reputation through quality contributions
3. Engage with the community

Once your score reaches ${threshold} or higher, you can rejoin the group.

If you believe this is an error, please contact the administrators.`;
}
