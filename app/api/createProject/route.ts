import { NextRequest, NextResponse } from "next/server";
import { getOrUpsertUserByWallet, supabaseServer } from "@/lib/supabase";
import { createProjectWithAttachments } from "@/lib/supabase";
import { uploadFiles } from "@/lib/supabase-storage";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const title = formData.get("title") as string;
        const summary = formData.get("summary") as string;
        const walletAddress = formData.get("wallet_address") as string;

        if (!title || !summary || !walletAddress) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get or create user
        const { data: user, error: userError } = await getOrUpsertUserByWallet(
            walletAddress
        );

        if (userError || !user) {
            return NextResponse.json(
                { error: "Failed to get user" },
                { status: 500 }
            );
        }

        // Upload files if any
        const files = formData.getAll("files") as File[];
        let attachmentUrls: Array<{ url: string; media_type: string }> = [];

        if (files.length > 0) {
            const basePath = `projects/${user.id}`;
            attachmentUrls = await uploadFiles(files, basePath);
        }

        // Create project with attachments
        const { data: project, error: projectError } =
            await createProjectWithAttachments(
                {
                    title,
                    summary,
                    user_id: user.id,
                },
                attachmentUrls
            );

        if (projectError || !project) {
            return NextResponse.json(
                { error: "Failed to create project" },
                { status: 500 }
            );
        }

        // Send Telegram Notification
        try {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = process.env.TELEGRAM_GROUP_ID;

            if (botToken && chatId) {
                const projectLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://fbi-bot.vercel.app"}/project/${project.id}`;
                let forumTopicId: number | undefined;
                let messageId: number | undefined;

                // 1. Try to create forum topic
                try {
                    const topicResponse = await fetch(
                        `https://api.telegram.org/bot${botToken}/createForumTopic`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chat_id: chatId,
                                name: title,
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
                                    text: `📋 *${title}*\n\n${summary}\n\n🔗 [View Project](${projectLink})\n\n_Reply to this thread with your feedback!_`,
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
                    console.warn("Failed to create forum topic, falling back to message:", topicError);

                    // Fallback: Send regular message
                    const msgResponse = await fetch(
                        `https://api.telegram.org/bot${botToken}/sendMessage`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: `🚀 *New Project: ${title}*\n\n${summary}\n\n🔗 [View Project](${projectLink})\n\n_Reply to this message to add feedback._`,
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
                        .eq("id", project.id);
                }
            }
        } catch (telegramError) {
            console.error("Error sending Telegram notification:", telegramError);
            // Don't fail the request if Telegram notification fails
        }

        return NextResponse.json({ success: true, project }, { status: 201 });
    } catch (error) {
        console.error("Error in createProject API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
