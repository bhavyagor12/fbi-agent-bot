/**
 * Kick a user from a Telegram group using the bot.
 *
 * Usage:
 *   npx tsx scripts/kick-user.ts <groupId> <userId>
 *
 * Example:
 *   npx tsx scripts/kick-user.ts -1003345930730 1017231892
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Error: TELEGRAM_BOT_TOKEN is not set in .env.local");
  process.exit(1);
}

const groupId = Number(process.argv[2]);
const userId = Number(process.argv[3]);

if (!groupId || !userId) {
  console.error("Usage: npx tsx scripts/kick-user.ts <groupId> <userId>");
  process.exit(1);
}

async function main() {
  const bot = new Bot(token!);

  console.log(`Kicking user ${userId} from group ${groupId}...`);

  await bot.api.banChatMember(groupId, userId);
  console.log(`Done. User ${userId} has been banned from group ${groupId}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to kick user:", err.message);
    process.exit(1);
  });
