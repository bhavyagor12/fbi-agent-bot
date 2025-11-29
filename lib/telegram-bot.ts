import { Bot } from "grammy";
import { handleHelpCommand } from "./bot/handlers/help";

import {
  handleFeedbackCommand,
  handleFeedbackSelection,
} from "./bot/handlers/feedback";
import { handleMessage } from "./bot/handlers/message";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not defined");
}

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Command: /feedback
bot.command("feedback", handleFeedbackCommand);

// Handle Callback Queries (Project Selection)
bot.callbackQuery(/^feedback_select:(.+)$/, handleFeedbackSelection);

// Command: /help
bot.command("help", handleHelpCommand);


// Handle Replies (Feedback) & Mentions
bot.on("message", handleMessage);
