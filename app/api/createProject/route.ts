import { NextRequest, NextResponse } from "next/server";
import { getOrUpsertUserByWallet, getOrUpsertUserByEmail, updateUserXPById, supabaseServer } from "@/lib/supabase";
import { createProjectWithAttachments } from "@/lib/supabase";
import { uploadFiles } from "@/lib/supabase-storage";
import { parseProjectSummary } from "@/lib/utils";
import { calculateProjectXP } from "@/lib/xp";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const title = formData.get("title") as string;
        const intro = formData.get("intro") as string;
        const features = formData.get("features") as string;
        const whatToTest = formData.get("what_to_test") as string;
        const productLink = formData.get("product_link") as string | null;
        const walletAddress = formData.get("wallet_address") as string;
        const email = formData.get("email") as string;

        if (!title || !intro || !features || !whatToTest || (!walletAddress && !email)) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Parse fields into markdown summary
        const summary = parseProjectSummary(intro, features, whatToTest, productLink || undefined);

        // Get or create user
        let user;
        let userError;

        if (walletAddress) {
            const result = await getOrUpsertUserByWallet(walletAddress);
            user = result.data;
            userError = result.error;
        }

        if (!user && email) {
            const result = await getOrUpsertUserByEmail(email);
            user = result.data;
            userError = result.error;
        }

        if (userError || !user) {
            return NextResponse.json(
                { error: "Failed to get user" },
                { status: 500 }
            );
        }

        // Check if user is approved
        if (!user.approved) {
            return NextResponse.json(
                { error: "Account pending approval. Please contact an admin." },
                { status: 403 }
            );
        }

        // Validate profile completeness
        const missingFields: string[] = [];
        if (!user.username) missingFields.push("Telegram username");
        if (!user.first_name) missingFields.push("First name");
        if (!user.last_name) missingFields.push("Last name");

        if (missingFields.length > 0) {
            return NextResponse.json(
                {
                    error: "Profile incomplete",
                    missingFields,
                },
                { status: 400 }
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

        // Award XP to the user for creating the project
        if (project.user_id) {
            const projectXP = calculateProjectXP();
            const xpResult = await updateUserXPById(project.user_id, projectXP);

            if (xpResult.error) {
                console.error("Error awarding project XP:", xpResult.error);
                // Don't fail the request if XP update fails
            } else {
                console.log(
                    `Awarded ${projectXP} XP to user ${project.user_id} for project ${project.id}`
                );
            }
        }

        // Create Telegram Forum Topic
        try {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = process.env.TELEGRAM_GROUP_ID;

            if (botToken && chatId && project.title && project.summary) {
                const projectLink = `https://fbibot.vercel.app/project/${project.id}`;
                let forumTopicId: number | undefined;
                let messageId: number | undefined;

                // Fetch project owner information from already fetched user object
                let ownerMention = "Project Owner";
                if (user.username) {
                    ownerMention = `@${user.username}`;
                } else if (user.telegram_user_id) {
                    const fullName = [user.first_name, user.last_name]
                        .filter(Boolean)
                        .join(" ") || "Project Owner";
                    ownerMention = `[${fullName}](tg://user?id=${user.telegram_user_id})`;
                }

                // Format message according to requirements (using HTML for better reliability)
                const messageText = `📋 <b>${project.title}</b>\n\n${project.summary}\n\nCheck project out at <a href="${projectLink}">${projectLink}</a>\n\nProject owner - ${ownerMention}\n\nAll msgs in these channel will be recorded as feedback`;

                // 1. Try to create forum topic
                try {
                    const topicResponse = await fetch(
                        `https://api.telegram.org/bot${botToken}/createForumTopic`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chat_id: chatId,
                                name: project.title,
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
                                    parse_mode: "HTML",
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
                                parse_mode: "HTML",
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
