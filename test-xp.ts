/**
 * Test script for XP system
 * Run with: npx tsx test-xp.ts
 */

import {
    calculateTier,
    calculateProjectXP,
    calculateFeedbackXP,
    getTierProgress,
    TIER_THRESHOLDS
} from './lib/xp';

console.log('🧪 Testing XP System\n');

// Test 1: Tier Calculation
console.log('📊 Test 1: Tier Calculation');
console.log('─────────────────────────');
const testXPValues = [0, 500, 999, 1000, 4999, 5000, 11999, 12000, 24999, 25000, 50000];
testXPValues.forEach(xp => {
    const tier = calculateTier(xp);
    console.log(`XP: ${xp.toString().padStart(5)} → Tier: ${tier.toUpperCase()}`);
});

// Test 2: Project XP
console.log('\n🚀 Test 2: Project XP');
console.log('─────────────────────────');
const projectXP = calculateProjectXP();
console.log(`Creating a project awards: ${projectXP} XP`);

// Test 3: Feedback XP - Perfect Scores
console.log('\n💬 Test 3: Feedback XP Calculations');
console.log('─────────────────────────');

const perfectScores = {
    relevance: 10,
    depth: 10,
    evidence: 10,
    constructiveness: 10,
    tone: 10,
    originality: 10
};
console.log(`Perfect feedback (all 10s): ${calculateFeedbackXP(perfectScores)} XP`);

const goodScores = {
    relevance: 8,
    depth: 7,
    evidence: 6,
    constructiveness: 8,
    tone: 9,
    originality: 7
};
console.log(`Good feedback (avg 7.5): ${calculateFeedbackXP(goodScores)} XP`);

const averageScores = {
    relevance: 5,
    depth: 5,
    evidence: 5,
    constructiveness: 5,
    tone: 5,
    originality: 5
};
console.log(`Average feedback (all 5s): ${calculateFeedbackXP(averageScores)} XP`);

const poorScores = {
    relevance: 2,
    depth: 2,
    evidence: 2,
    constructiveness: 2,
    tone: 2,
    originality: 2
};
console.log(`Poor feedback (all 2s): ${calculateFeedbackXP(poorScores)} XP`);

// Test 4: Anti-Farming Logic
console.log('\n🛡️ Test 4: Anti-Farming (Low Originality)');
console.log('─────────────────────────');

const lowOriginalityGoodOthers = {
    relevance: 9,
    depth: 9,
    evidence: 8,
    constructiveness: 9,
    tone: 9,
    originality: 3  // Low originality triggers penalty
};
const xpWithoutPenalty = (9 + 9 + 8 + 9 + 9 + 3) / 6 * 10;
const xpWithPenalty = calculateFeedbackXP(lowOriginalityGoodOthers);
console.log(`Good scores but low originality (3):`);
console.log(`  Without penalty: ${Math.round(xpWithoutPenalty)} XP`);
console.log(`  With 50% penalty: ${xpWithPenalty} XP`);
console.log(`  Reduction: ${Math.round(xpWithoutPenalty - xpWithPenalty)} XP`);

const highOriginality = {
    relevance: 9,
    depth: 9,
    evidence: 8,
    constructiveness: 9,
    tone: 9,
    originality: 8  // High originality, no penalty
};
console.log(`\nSame scores but high originality (8): ${calculateFeedbackXP(highOriginality)} XP (no penalty)`);

// Test 5: Tier Progress
console.log('\n📈 Test 5: Tier Progress Tracking');
console.log('─────────────────────────');

const progressTests = [500, 999, 1500, 5500, 24999];
progressTests.forEach(xp => {
    const progress = getTierProgress(xp);
    console.log(`\nXP: ${xp}`);
    console.log(`  Current Tier: ${progress.currentTier.toUpperCase()}`);
    console.log(`  Progress: ${progress.progressPercentage}%`);
    if (progress.nextTierConfig) {
        console.log(`  Next Tier: ${progress.nextTierConfig.name.toUpperCase()}`);
        console.log(`  XP to Next: ${progress.xpToNextTier}`);
    } else {
        console.log(`  🏆 MAX TIER REACHED!`);
    }
});

// Test 6: Tier Thresholds Display
console.log('\n🏅 Test 6: All Tier Thresholds');
console.log('─────────────────────────');
TIER_THRESHOLDS.forEach(tier => {
    console.log(`${tier.name.toUpperCase().padEnd(10)} │ ${tier.minXP.toString().padStart(6)} - ${tier.maxXP === Infinity ? '∞      ' : tier.maxXP.toString().padEnd(6)} XP │ ${tier.label}`);
});

console.log('\n✅ All tests completed!\n');
