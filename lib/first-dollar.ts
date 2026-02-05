/**
 * First Dollar API Integration
 *
 * This module handles integration with the First Dollar app API
 * to check user onchain scores based on their Telegram username.
 */

export interface FirstDollarUserScore {
  username: string;
  score: number;
  eligible: boolean;
}

const FIRST_DOLLAR_ONCHAIN_SCORE_URL =
  "https://app.firstdollar.money/api/onchain-score";

/**
 * Fetches a user's onchain score from the First Dollar API
 *
 * @param telegramUsername - The user's Telegram username (without @)
 * @returns User score data including score and eligibility
 */
export async function getFirstDollarScore(
  telegramUsername: string | undefined
): Promise<FirstDollarUserScore> {
  if (!telegramUsername) {
    console.log("[FirstDollar] No username provided, treating as score 0");
    return {
      username: "unknown",
      score: 0,
      eligible: false,
    };
  }

  const cleanUsername = telegramUsername.replace(/^@/, "").trim();
  if (!cleanUsername) {
    console.log("[FirstDollar] Empty username provided, treating as score 0");
    return {
      username: "unknown",
      score: 0,
      eligible: false,
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
      // Treat missing users as score 0 and not eligible.
      return {
        username: cleanUsername,
        score: 0,
        eligible: false,
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
        eligible: false,
      };
    }

    const onchainScore =
      typeof (data as { onchain_score?: number }).onchain_score === "number"
        ? (data as { onchain_score: number }).onchain_score
        : 0;
    const eligible = (data as { eligible?: boolean }).eligible === true;

    return {
      username: cleanUsername,
      score: onchainScore,
      eligible,
    };
  } catch (error) {
    console.error("[FirstDollar] Error fetching user score:", error);
    return {
      username: telegramUsername?.replace(/^@/, "").trim() || "unknown",
      score: 0,
      eligible: false,
    };
  }
}

/**
 * Checks if a user is eligible to join based on First Dollar backend.
 *
 * @param telegramUsername - The user's Telegram username
 * @returns Object with eligibility boolean and score details
 */
export async function checkUserEligibility(
  telegramUsername: string | undefined
): Promise<{
  eligible: boolean;
  score: number;
  username: string;
}> {
  const scoreData = await getFirstDollarScore(telegramUsername);

  return {
    eligible: scoreData.eligible,
    score: scoreData.score,
    username: scoreData.username,
  };
}

/**
 * Generates a DM message explaining why the user was removed from the group
 *
 * @param score - User's current score
 * @returns Formatted message for the user
 */
export function generateEligibilityDMMessage(score: number): string {
  if (score === 0) {
    // User not registered in First Dollar
    return `You need to be registered on First Dollar to join this group.

To get access:
1. Sign up on First Dollar
2. Build your score through quality contributions
3. Once you're eligible, you can rejoin the group

If you believe this is an error, please contact the administrators.`;
  }

  return `Your First Dollar account is not eligible to join this group.

To increase your score and gain access:
1. Complete more activities on First Dollar
2. Build your reputation through quality contributions
3. Engage with the community

Once you're eligible, you can rejoin the group.

If you believe this is an error, please contact the administrators.`;
}
