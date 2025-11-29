/**
 * Color utilities for score and tier display
 *
 * - Scores: Red to Green gradient (1-10)
 * - Tiers: Valorant-inspired rank colors
 */

export type UserTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

/**
 * Get color for a score (1-10) using a red to green gradient
 * Returns Tailwind color classes for background and text
 */
export function getScoreColor(score: number): {
  bg: string;
  text: string;
  hex: string;
} {
  // Normalize score to 0-1 range
  const normalized = Math.max(0, Math.min(10, score)) / 10;

  // Define color stops for red -> yellow -> green gradient
  if (normalized < 0.5) {
    // Red to Yellow (scores 1-5)
    return {
      bg: "bg-red-500/10",
      text: "text-red-500",
      hex: interpolateColor("#ef4444", "#eab308", normalized * 2),
    };
  } else {
    // Yellow to Green (scores 6-10)
    return {
      bg: "bg-green-500/10",
      text: "text-green-500",
      hex: interpolateColor("#eab308", "#22c55e", (normalized - 0.5) * 2),
    };
  }
}

/**
 * Get precise hex color for a score (1-10) using red to green gradient
 */
export function getScoreHexColor(score: number): string {
  const normalized = Math.max(0, Math.min(10, score)) / 10;

  if (normalized < 0.5) {
    // Red to Yellow (scores 1-5)
    return interpolateColor("#ef4444", "#eab308", normalized * 2);
  } else {
    // Yellow to Green (scores 6-10)
    return interpolateColor("#eab308", "#22c55e", (normalized - 0.5) * 2);
  }
}

/**
 * Get Valorant-inspired colors for user tiers
 */
export function getTierColor(tier: UserTier): {
  bg: string;
  text: string;
  hex: string;
  label: string;
} {
  const tierColors: Record<
    UserTier,
    { bg: string; text: string; hex: string; label: string }
  > = {
    bronze: {
      bg: "bg-orange-700/10",
      text: "text-orange-700",
      hex: "#c2410c",
      label: "Bronze",
    },
    silver: {
      bg: "bg-slate-400/10",
      text: "text-slate-400",
      hex: "#94a3b8",
      label: "Silver",
    },
    gold: {
      bg: "bg-yellow-500/10",
      text: "text-yellow-500",
      hex: "#eab308",
      label: "Gold",
    },
    platinum: {
      bg: "bg-cyan-400/10",
      text: "text-cyan-400",
      hex: "#22d3ee",
      label: "Platinum",
    },
    diamond: {
      bg: "bg-purple-400/10",
      text: "text-purple-400",
      hex: "#c084fc",
      label: "Diamond",
    },
  };

  return tierColors[tier];
}

/**
 * Helper function to interpolate between two hex colors
 */
function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));

  return rgbToHex(r, g, b);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
