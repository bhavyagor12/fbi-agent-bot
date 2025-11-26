import fs from 'fs';
import path from 'path';
// import { analyzeFeedback } from './lib/ai'; // Removed static import

// 1. Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from .env.local...');
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
            process.env[key] = value;
        }
    });
} else {
    console.warn('Warning: .env.local file not found.');
}

async function runTest() {
    console.log('🧪 Testing AI Feedback Analysis...');

    // Sample Data
    const projectContext = "A new mobile app for tracking daily water intake. Features include reminders, history charts, and achievements.";
    const feedbackText = "I really like the reminders, but the charts are a bit confusing. It would be nice if I could zoom in on specific days.";
    const hasMedia = false;

    console.log('\n--- Input ---');
    console.log(`Project Context: ${projectContext}`);
    console.log(`Feedback: "${feedbackText}"`);
    console.log(`Has Media: ${hasMedia}`);

    console.log('\n--- Analyzing... ---');
    const start = Date.now();

    try {
        // Dynamic import to ensure env vars are loaded first
        const { analyzeFeedback } = await import('./lib/ai');
        const result = await analyzeFeedback(feedbackText, projectContext, hasMedia);
        const duration = Date.now() - start;

        console.log(`\n--- Result (${duration}ms) ---`);
        if (result) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log('❌ Analysis returned null.');
        }
    } catch (error) {
        console.error('❌ Error during analysis:', error);
    }
}

runTest();
