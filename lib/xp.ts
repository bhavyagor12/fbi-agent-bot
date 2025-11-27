/**
 * XP (Experience Points) System
 *
 * Manages user progression through tiers based on XP earned from:
 * - Creating projects
 * - Providing quality feedback
 */

export type UserTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface TierConfig {
  name: UserTier;
  minXP: number;
  maxXP: number;
  label: string;
}

/**
 * Tier thresholds and configuration
 */
export const TIER_THRESHOLDS: TierConfig[] = [
  {
    name: "bronze",
    minXP: 0,
    maxXP: 999,
    label: "Bronze - Beginner / Newcomer",
  },
  {
    name: "silver",
    minXP: 1000,
    maxXP: 4999,
    label: "Silver - Active Contributor",
  },
  {
    name: "gold",
    minXP: 5000,
    maxXP: 11999,
    label: "Gold - Reliable Builder / Creator",
  },
  {
    name: "platinum",
    minXP: 12000,
    maxXP: 24999,
    label: "Platinum - Top 10-15%",
  },
  {
    name: "diamond",
    minXP: 25000,
    maxXP: Infinity,
    label: "Diamond - Top 1-3% (elite)",
  },
];

/**
 * XP constants
 */
export const XP_CONSTANTS = {
  PROJECT_BASE: 200, // Fixed XP for creating a project
  FEEDBACK_MIN: 200, // Minimum XP for any feedback
  FEEDBACK_MAX: 500, // Maximum XP for perfect feedback
  ORIGINALITY_THRESHOLD: 5, // Below this, XP is penalized
  ORIGINALITY_PENALTY: 0.5, // 50% reduction for low originality
};

/**
 * Calculate the user's tier based on their total XP
 */
export function calculateTier(xp: number): UserTier {
  for (const tier of TIER_THRESHOLDS) {
    if (xp >= tier.minXP && xp <= tier.maxXP) {
      return tier.name;
    }
  }
  // Default to bronze if somehow out of range
  return "bronze";
}

/**
 * Get tier configuration by tier name
 */
export function getTierConfig(tier: UserTier): TierConfig | undefined {
  return TIER_THRESHOLDS.find((t) => t.name === tier);
}

/**
 * Calculate XP earned for creating a project
 */
export function calculateProjectXP(): number {
  return XP_CONSTANTS.PROJECT_BASE;
}

/**
 * Calculate XP earned for providing feedback
 *
 * @param scores - AI-evaluated scores including originality
 * @returns XP amount (200-500 points)
 */
export function calculateFeedbackXP(scores: {
  relevance: number;
  depth: number;
  evidence: number;
  constructiveness: number;
  tone: number;
  originality: number;
}): number {
  const { relevance, depth, evidence, constructiveness, tone, originality } =
    scores;

  // No XP if originality is 1 or lower (duplicate/unoriginal feedback)
  if (originality <= 1) {
    return 0;
  }

  // Calculate average score (all scores are 1-10)
  const average =
    (relevance + depth + evidence + constructiveness + tone + originality) / 6;

  // Convert to XP scale (1-10 average -> 200-500 XP)
  // Map [1, 10] to [FEEDBACK_MIN, FEEDBACK_MAX]
  let xp =
    XP_CONSTANTS.FEEDBACK_MIN +
    (average - 1) *
      ((XP_CONSTANTS.FEEDBACK_MAX - XP_CONSTANTS.FEEDBACK_MIN) / 9);

  // Apply anti-farming penalty if originality is low
  if (originality < XP_CONSTANTS.ORIGINALITY_THRESHOLD) {
    xp = xp * XP_CONSTANTS.ORIGINALITY_PENALTY;
  }

  // Ensure minimum and maximum bounds
  xp = Math.max(XP_CONSTANTS.FEEDBACK_MIN, xp);
  xp = Math.min(XP_CONSTANTS.FEEDBACK_MAX, xp);

  // Round to nearest integer
  return Math.round(xp);
}

/**
 * Get progress to next tier
 */
export function getTierProgress(xp: number): {
  currentTier: UserTier;
  currentTierConfig: TierConfig;
  nextTierConfig: TierConfig | null;
  progressPercentage: number;
  xpToNextTier: number;
} {
  const currentTier = calculateTier(xp);
  const currentTierConfig = getTierConfig(currentTier)!;
  const currentIndex = TIER_THRESHOLDS.findIndex((t) => t.name === currentTier);
  const nextTierConfig =
    currentIndex < TIER_THRESHOLDS.length - 1
      ? TIER_THRESHOLDS[currentIndex + 1]
      : null;

  let progressPercentage = 0;
  let xpToNextTier = 0;

  if (nextTierConfig) {
    const tierRange = currentTierConfig.maxXP - currentTierConfig.minXP + 1;
    const xpInCurrentTier = xp - currentTierConfig.minXP;
    progressPercentage = (xpInCurrentTier / tierRange) * 100;
    xpToNextTier = nextTierConfig.minXP - xp;
  } else {
    // Already at max tier
    progressPercentage = 100;
    xpToNextTier = 0;
  }

  return {
    currentTier,
    currentTierConfig,
    nextTierConfig,
    progressPercentage: Math.round(progressPercentage),
    xpToNextTier: Math.max(0, xpToNextTier),
  };
}
