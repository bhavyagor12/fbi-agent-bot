import { Context } from "grammy";
import { createProject, getOrUpsertUser, updateUserXP } from "../../supabase";
import { calculateProjectXP } from "../../xp";

// Helper to parse project command text
function parseProjectCommand(
  text: string
): { title: string; summary: string } | null {
  let cleanTitle = "";
  let summary = "";

  // Check for "Title:" format (multi-line)
  if (text.includes("\n") && text.toLowerCase().includes("title:")) {
    const lines = text.split("\n");
    const titleLineIndex = lines.findIndex((line) =>
      line.toLowerCase().trim().startsWith("title:")
    );

    if (titleLineIndex !== -1) {
      // Extract title
      cleanTitle = lines[titleLineIndex].substring(6).trim(); // Remove "Title:"

      // Extract summary (everything else)
      summary = lines
        .slice(titleLineIndex + 1)
        .join("\n")
        .trim();
    }
  }

  // Fallback to hyphen format if title not found yet
  if (!cleanTitle && text.includes("-")) {
    const [titlePart, ...summaryParts] = text.split("-");
    cleanTitle = titlePart.trim();
    summary = summaryParts.join("-").trim();
  }

  if (!cleanTitle || !summary) return null;

  return { title: cleanTitle, summary };
}

export async function handleStartProject(ctx: Context) {
  const text = ctx.match;
  if (!text || typeof text !== "string") {
    return ctx.reply(
      "Usage:\n1. /startproject <title> - <summary>\n2. /startproject\nTitle: <title>\n<summary>"
    );
  }

  const parsed = parseProjectCommand(text);

  if (!parsed) {
    return ctx.reply(
      "Please provide both a title and a summary.\n\nFormat:\n/startproject Title - Summary\nOR\n/startproject\nTitle: My Project\nMy Summary..."
    );
  }

  const { title: cleanTitle, summary } = parsed;

  if (!ctx.from || !ctx.message) {
    return ctx.reply("Could not identify user or message.");
  }

  try {
    // 1. Get or Upsert User
    await getOrUpsertUser({
      telegram_user_id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
    });

    // 2. Send the project root message
    const message = await ctx.reply(
      `🚀 *New Project: ${cleanTitle}*\n\n${summary}\n\n_Reply to this message to add feedback._`,
      { parse_mode: "Markdown" }
    );

    // 3. Store in Supabase
    const { error } = await createProject({
      title: cleanTitle,
      summary: summary,
      telegram_message_id: message.message_id,
      telegram_chat_id: ctx.message.chat.id,
      user_id: ctx.from.id,
    });

    if (error) {
      console.error("Supabase error:", error);
      return ctx.reply("Failed to save project to database.");
    }

    const projectXP = calculateProjectXP();
    await updateUserXP(ctx.from.id, projectXP);
    console.log(
      `Awarded ${projectXP} XP to user ${ctx.from.id} for creating project`
    );

    // React to the original message (command)
    try {
      await ctx.react("👍");
    } catch {
      // ignore
    }
  } catch (error) {
    console.error("Error creating project:", error);
    ctx.reply("An error occurred while creating the project.");
  }
}
