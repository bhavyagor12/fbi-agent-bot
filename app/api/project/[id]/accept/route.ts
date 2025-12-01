import { NextRequest, NextResponse } from "next/server";
import {
  acceptProject,
  supabaseServer,
  updateUserXPById,
} from "@/lib/supabase";
import { calculateProjectXP } from "@/lib/xp";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { data, error } = await acceptProject(projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Award XP to the user for creating the project
    if (data.user_id) {
      const projectXP = calculateProjectXP();
      const xpResult = await updateUserXPById(data.user_id, projectXP);

      if (xpResult.error) {
        console.error("Error awarding project XP:", xpResult.error);
        // Don't fail the request if XP update fails
      } else {
        console.log(
          `Awarded ${projectXP} XP to user ${data.user_id} for project ${data.id}`
        );
      }
    }

    // Create Telegram Forum Topic when project is accepted
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_GROUP_ID;

      if (botToken && chatId && data.title && data.summary) {
        const projectLink = `https://fbibot.vercel.app/project/${data.id}`;
        let forumTopicId: number | undefined;
        let messageId: number | undefined;

        // Fetch project owner information
        let ownerMention = "Project Owner";
        if (data.user_id) {
          const { data: owner } = await supabaseServer
            .from("users")
            .select("username, telegram_user_id, first_name, last_name")
            .eq("id", data.user_id)
            .single();

          if (owner) {
            if (owner.username) {
              ownerMention = `@${owner.username}`;
            } else if (owner.telegram_user_id) {
              // Use user mention link if no username but has telegram_user_id
              const fullName = [owner.first_name, owner.last_name]
                .filter(Boolean)
                .join(" ") || "Project Owner";
              ownerMention = `[${fullName}](tg://user?id=${owner.telegram_user_id})`;
            }
          }
        }

        // Format message according to requirements
        const messageText = `📋 *${data.title}*\n\n${data.summary}\n\nCheck project out at [${projectLink}](${projectLink})\n\nProject owner - ${ownerMention}\n\nAll msgs in these channel will be recorded as feedback`;

        // 1. Try to create forum topic
        try {
          const topicResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/createForumTopic`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                name: data.title,
                icon_color: 0x6fb9f0,
              }),
            }
          );

          const topicData = await topicResponse.json();

          if (topicData.ok) {
            forumTopicId = topicData.result.message_thread_id;

            // Send message to topic
            const msgResponse = await fetch(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_thread_id: forumTopicId,
                  text: messageText,
                  parse_mode: "Markdown",
                }),
              }
            );
            const msgData = await msgResponse.json();
            if (msgData.ok) messageId = msgData.result.message_id;
          } else {
            throw new Error("Failed to create topic: " + topicData.description);
          }
        } catch (topicError) {
          console.warn(
            "Failed to create forum topic, falling back to message:",
            topicError
          );

          // Fallback: Send regular message
          const msgResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: messageText,
                parse_mode: "Markdown",
              }),
            }
          );
          const msgData = await msgResponse.json();
          if (msgData.ok) messageId = msgData.result.message_id;
        }

        // Update project with Telegram info
        if (forumTopicId || messageId) {
          await supabaseServer
            .from("projects")
            .update({
              forum_topic_id: forumTopicId,
              telegram_message_id: messageId,
              telegram_chat_id: Number(chatId),
            })
            .eq("id", data.id);
        }
      }
    } catch (telegramError) {
      console.error("Error sending Telegram notification:", telegramError);
      // Don't fail the request if Telegram notification fails
    }

    return NextResponse.json({ success: true, project: data }, { status: 200 });
  } catch (error) {
    console.error("Error in accept project API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
