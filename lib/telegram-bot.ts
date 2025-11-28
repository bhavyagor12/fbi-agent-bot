import { Bot } from "grammy";
import { handleStartProject } from "./bot/handlers/startProject";
import { handleHelpCommand } from "./bot/handlers/help";

import {
  handleFeedbackCommand,
  handleFeedbackSelection,
} from "./bot/handlers/feedback";
import { handleMessage } from "./bot/handlers/message";
import { handleSummaryCommand } from "./bot/handlers/summary";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not defined");
}

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Command: /startproject <title> - <summary>
bot.command("startproject", handleStartProject);

// Command: /feedback
bot.command("feedback", handleFeedbackCommand);

// Handle Callback Queries (Project Selection)
bot.callbackQuery(/^feedback_select:(.+)$/, handleFeedbackSelection);

// Command: /summary (Reply to project post)
bot.command("summary", handleSummaryCommand);

// Command: /help
bot.command("help", handleHelpCommand);


// Handle Replies (Feedback) & Mentions
bot.on("message", handleMessage);
