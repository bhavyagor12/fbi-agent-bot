import { Context } from "grammy";

export async function handleHelpCommand(ctx: Context) {
  const helpMessage = `
🤖 *Radar Room Bot Help*

Welcome! Here's how to use the bot:

🌐 *Web Interface*
• Create projects and view all active projects at:
  https://radarroom.vercel.app/
• Complete your profile (Telegram username, name) to create projects
• Approved users can create projects immediately

📝 *Giving Feedback*
• \`/feedback\`
  Select a project from the list to give feedback
• \`Reply to a project thread\`
  Simply reply to any project message in a forum topic to add your feedback
• Your feedback is automatically analyzed for quality and relevance
• Earn XP based on the quality of your feedback!

💬 *How It Works*
• Projects are posted as forum topics in this group
• Reply to the project thread with your feedback
• The bot analyzes your feedback and awards XP
• View all projects and feedback on the web: https://radarroom.vercel.app/

❓ *Commands*
• \`/help\` - Show this help message
• \`/feedback\` - Select a project to give feedback on

_Need help? Visit https://radarroom.vercel.app/_
`;

  await ctx.reply(helpMessage, { parse_mode: "Markdown" });
}
