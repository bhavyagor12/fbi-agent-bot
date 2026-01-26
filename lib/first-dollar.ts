/**
 * First Dollar API Integration
 *
 * This module handles integration with the First Dollar app API
 * to check user scores based on their Telegram username.
 *
 * Currently mocked - replace with actual API calls when available.
 */

export interface FirstDollarUserScore {
  username: string;
  score: number;
  threshold: number;
}

// Default threshold - can be overridden by API response
const DEFAULT_THRESHOLD = 50;

// Mock user scores for testing (remove when real API is available)
const MOCK_SCORES: Record<string, number> = {
  // Add test usernames here for development
  // "lowscoreuser": 30,
  // "highscoreuser": 100,
};

/**
 * Fetches a user's score from the First Dollar API
 *
 * @param telegramUsername - The user's Telegram username (without @)
 * @returns User score data including score and threshold, or null if user not found
 */
export async function getFirstDollarScore(
  telegramUsername: string | undefined
): Promise<FirstDollarUserScore | null> {
  if (!telegramUsername) {
    console.log("[FirstDollar] No username provided, cannot check score");
    return null;
  }

  // Remove @ prefix if present
  const cleanUsername = telegramUsername.replace(/^@/, "");

  try {
    // TODO: Replace with actual API call when available
    // Example API implementation:
    // const response = await fetch(`${FIRST_DOLLAR_API_URL}/user/${cleanUsername}/score`, {
    //   headers: {
    //     "Authorization": `Bearer ${process.env.FIRST_DOLLAR_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    // });
    //
    // if (!response.ok) {
    //   if (response.status === 404) {
    //     return null; // User not found
    //   }
    //   throw new Error(`First Dollar API error: ${response.status}`);
    // }
    //
    // const data = await response.json();
    // return {
    //   username: cleanUsername,
    //   score: data.score,
    //   threshold: data.threshold ?? DEFAULT_THRESHOLD,
    // };

    // MOCK IMPLEMENTATION - Remove when real API is available
    console.log(`[FirstDollar] Checking score for user: ${cleanUsername}`);

    // Check if user has a mock score defined
    if (cleanUsername in MOCK_SCORES) {
      const score = MOCK_SCORES[cleanUsername];
      console.log(`[FirstDollar] Mock score for ${cleanUsername}: ${score}`);
      return {
        username: cleanUsername,
        score,
        threshold: DEFAULT_THRESHOLD,
      };
    }

    // For users not in mock list, return score of 0 (not registered in First Dollar)
    // This means they will be blocked - users must be in First Dollar to participate
    console.log(`[FirstDollar] User ${cleanUsername} not found in First Dollar (will be blocked)`);
    return {
      username: cleanUsername,
      score: 0,
      threshold: DEFAULT_THRESHOLD,
    };

  } catch (error) {
    console.error("[FirstDollar] Error fetching user score:", error);
    // On API error, fail open (allow the user) to prevent blocking legitimate users
    return null;
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
} | null> {
  const scoreData = await getFirstDollarScore(telegramUsername);

  if (!scoreData) {
    // User not found in First Dollar - allow them by default
    return null;
  }

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
