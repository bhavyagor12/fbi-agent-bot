import { Context } from "grammy";

export async function handleHelpCommand(ctx: Context) {
  const helpMessage = `
🤖 *FBI Agent Bot Help*

Here are the available commands:

📌 *Project Management*
• \`/startproject <Title> - <Summary>\`
  Start a new project thread.
  _Example:_ \`/startproject New Feature - Adding a dark mode\`

📝 *Feedback & Analysis*
• \`/feedback\`
  Get feedback on a project. You can select a project from the list or reply to a project message.
• \`Reply to a project message\`
  Send a message replying to a project thread to add context or updates.
• \`Mention the bot (@botname)\`
  Mention the bot in a reply to trigger feedback or analysis.

📊 *Summaries*
• \`/summary\`
  Reply to a project thread with this command to get a summary of the discussion.

❓ *General*
• \`/help\`
  Show this help message.

_Feel free to ask me anything about your projects!_
`;

  await ctx.reply(helpMessage, { parse_mode: "Markdown" });
}
