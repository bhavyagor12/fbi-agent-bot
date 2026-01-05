import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse project fields into a markdown summary
 * Combines intro, features, and what to test into a formatted markdown string
 */
export function parseProjectSummary(
  intro: string,
  features: string,
  whatToTest: string,
  productLink?: string
): string {
  const sections: string[] = [];

  // Intro section
  if (intro.trim()) {
    sections.push(`## Intro\n\n${intro.trim()}`);
  }

  // Features section
  if (features.trim()) {
    sections.push(`## Features\n\n${features.trim()}`);
  }

  // What to Test section
  if (whatToTest.trim()) {
    sections.push(`## What to Test\n\n${whatToTest.trim()}`);
  }

  // Product Link section (if provided)
  if (productLink && productLink.trim()) {
    const link = productLink.trim();
    // Ensure it starts with http:// or https://
    const formattedLink = link.startsWith('http://') || link.startsWith('https://') 
      ? link 
      : `https://${link}`;
    sections.push(`## Product Link\n\n[${formattedLink}](${formattedLink})`);
  }

  return sections.join('\n\n');
}

/**
 * Extract project fields from a markdown summary
 * Reverse of parseProjectSummary
 */
export function extractProjectFields(summary: string): {
  intro: string;
  features: string;
  whatToTest: string;
  productLink: string;
} {
  const introMatch = summary.match(/## Intro\s*\n\n([\s\S]*?)(?=\n\n## |$)/);
  const featuresMatch = summary.match(/## Features\s*\n\n([\s\S]*?)(?=\n\n## |$)/);
  const whatToTestMatch = summary.match(/## What to Test\s*\n\n([\s\S]*?)(?=\n\n## |$)/);
  const productLinkMatch = summary.match(/## Product Link\s*\n\n\[(.*?)\]\((.*?)\)/);

  return {
    intro: introMatch ? introMatch[1].trim() : '',
    features: featuresMatch ? featuresMatch[1].trim() : '',
    whatToTest: whatToTestMatch ? whatToTestMatch[1].trim() : '',
    productLink: productLinkMatch ? productLinkMatch[2].trim() : '',
  };
}
