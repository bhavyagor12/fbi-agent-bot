import { Bot, Context, webhookCallback, InlineKeyboard } from 'grammy';
import {
    createProject,
    getProjectByMessageId,
    getFeedbackByProjectId,
    createFeedback,
    getFeedbackByMessageId,
    getOrUpsertUser,
    getActiveProjects,
    findProjectByName,
    getProjectById,
    updateFeedbackScores
} from './supabase';
import { analyzeFeedback } from './ai';

if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined');
}

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Command: /startproject <title> - <summary>
bot.command('startproject', async (ctx) => {
    const text = ctx.match;
    if (!text || typeof text !== 'string' || !text.includes('-')) {
        return ctx.reply(
            'Usage: /startproject <title> - <summary>\nExample: /startproject New Website - A redesign of our landing page.'
        );
    }

    const [title, ...summaryParts] = text.split('-');
    const summary = summaryParts.join('-').trim();
    const cleanTitle = title.trim();

    if (!cleanTitle || !summary) {
        return ctx.reply('Please provide both a title and a summary.');
    }

    if (!ctx.from) {
        return ctx.reply('Could not identify user.');
    }

    try {
        // 1. Get or Upsert User
        await getOrUpsertUser({
            telegram_user_id: ctx.from.id,
            username: ctx.from.username,
            first_name: ctx.from.first_name,
            last_name: ctx.from.last_name
        });

        // 2. Send the project root message
        const message = await ctx.reply(
            `🚀 *New Project: ${cleanTitle}*\n\n${summary}\n\n_Reply to this message to add feedback._`,
            { parse_mode: 'Markdown' }
        );

        // 3. Store in Supabase
        const { error } = await createProject({
            title: cleanTitle,
            summary: summary,
            telegram_message_id: message.message_id,
            telegram_chat_id: ctx.chat.id,
            user_id: ctx.from.id
        });

        if (error) {
            console.error('Supabase error:', error);
            return ctx.reply('Failed to save project to database.');
        }

        // React to the original message (command)
        try {
            await ctx.react('👍');
        } catch (e) {
            // ignore
        }

    } catch (error) {
        console.error('Error creating project:', error);
        ctx.reply('An error occurred while creating the project.');
    }
});

// Command: /feedback
bot.command('feedback', async (ctx) => {
    const { data: projects, error } = await getActiveProjects();

    if (error || !projects || projects.length === 0) {
        return ctx.reply('No active projects found.');
    }

    const keyboard = new InlineKeyboard();
    projects.forEach((p) => {
        keyboard.text(p.title, `feedback_select:${p.id}`).row();
    });

    await ctx.reply('Select a project to give feedback on:', { reply_markup: keyboard });
});

// Handle Callback Queries (Project Selection)
bot.callbackQuery(/^feedback_select:(.+)$/, async (ctx) => {
    const projectId = ctx.match[1];
    const { data: project } = await getProjectById(parseInt(projectId));

    if (!project) {
        return ctx.answerCallbackQuery('Project not found.');
    }

    await ctx.answerCallbackQuery();
    // Force reply to this message so we can track it
    await ctx.reply(
        `Please reply to this message with your feedback for *${project.title}*.`,
        {
            parse_mode: 'Markdown',
            reply_markup: { force_reply: true }
        }
    );
});


// Command: /summary (Reply to project post)
bot.command('summary', async (ctx) => {
    if (!ctx.message?.reply_to_message) {
        return ctx.reply('Please reply to a project message to get a summary.');
    }

    const replyToId = ctx.message.reply_to_message.message_id;

    // Find the project associated with this message
    const { data: project, error } = await getProjectByMessageId(replyToId);

    if (error || !project) {
        return ctx.reply('Project not found. Make sure you are replying to the original project post.');
    }

    // Fetch all feedback
    const { data: feedback, error: feedbackError } = await getFeedbackByProjectId(project.id);

    if (feedbackError) {
        return ctx.reply("Error fetching feedback.");
    }

    if (!feedback || feedback.length === 0) {
        return ctx.reply("No feedback found for this project yet.");
    }

    // TODO: Integrate AI summarization here
    // For now, just count the feedback
    await ctx.reply(
        `📊 *Summary for ${project.title}*\n\nFound ${feedback.length} feedback items.\n\n_AI Summarization coming soon..._`,
        { parse_mode: 'Markdown' }
    );
});

// Handle Replies (Feedback) & Mentions
bot.on('message', async (ctx) => {
    const message = ctx.message;
    const replyTo = message.reply_to_message;
    const text = message.text || message.caption || '';

    if (!message.from) return;

    // Upsert User (always good to keep user data fresh)
    await getOrUpsertUser({
        telegram_user_id: message.from.id,
        username: message.from.username,
        first_name: message.from.first_name,
        last_name: message.from.last_name
    });

    let projectId: number | null = null;

    // Case 1: Reply to a message
    if (replyTo) {
        // 1a. Check if replying to a project root message
        const { data: project } = await getProjectByMessageId(replyTo.message_id);
        if (project) {
            projectId = project.id;
        } else {
            // 1b. Check if replying to another feedback
            const { data: parentFeedback } = await getFeedbackByMessageId(replyTo.message_id);
            if (parentFeedback) {
                projectId = parentFeedback.project_id;
            } else {
                // 1c. Check if replying to the bot's "Send feedback for X" message
                if (replyTo.from?.id === ctx.me.id && replyTo.text?.includes('feedback for')) {
                    // Extract project name from the bot's message text
                    // Format: "Please reply to this message with your feedback for *Project Name*."
                    // We can try to parse it, or better, we should have encoded it.
                    // But for now, let's try to find the project by name from the text.
                    // This is a bit brittle but works for V1.
                    // Regex: feedback for (.*)\.
                    const match = replyTo.text.match(/feedback for \*([^*]+)\*\./);
                    if (match) {
                        const projectName = match[1];
                        const { data: p } = await findProjectByName(projectName);
                        if (p) projectId = p.id;
                    }
                }
            }
        }
    }

    // Case 2: No reply, check for project name mention
    if (!projectId && text) {
        // Get all active projects to check against
        // Optimization: In a real app, we might use a more efficient search or cache.
        const { data: projects } = await getActiveProjects();
        if (projects) {
            for (const p of projects) {
                // Simple case-insensitive inclusion check
                // "I think Project A is great" -> Matches "Project A"
                if (text.toLowerCase().includes(p.title.toLowerCase())) {
                    projectId = p.id;
                    break; // Match first found
                }
            }
        }
    }

    // If still no project found, ignore
    if (!projectId) return;

    // Store Feedback
    // Basic media handling (just grabbing the first photo/doc if exists)
    let mediaUrl = null;
    let mediaType = null;

    if (message.photo) {
        mediaType = 'photo';
        // Get largest photo
        mediaUrl = message.photo[message.photo.length - 1].file_id;
    } else if (message.document) {
        mediaType = 'document';
        mediaUrl = message.document.file_id;
    }

    const { data: savedFeedback, error } = await createFeedback({
        project_id: projectId,
        user_id: message.from.id,
        content: text,
        message_id: message.message_id,
        parent_message_id: replyTo?.message_id,
        media_url: mediaUrl,
        media_type: mediaType
    });

    if (error) {
        console.error("Error saving feedback:", error);
    } else {
        // React to confirm receipt
        try {
            await ctx.react('👍');
        } catch (e) {
            // ignore
        }

        // Run AI Analysis asynchronously
        if (savedFeedback && text) {
            // Fetch project context (summary)
            const { data: project } = await getProjectById(projectId);
            if (project) {
                analyzeFeedback(text, project.summary, !!mediaUrl).then(async (scores) => {
                    if (scores) {
                        await updateFeedbackScores(savedFeedback.id, {
                            score_relevance: scores.relevance,
                            score_depth: scores.depth,
                            score_evidence: scores.evidence,
                            score_constructiveness: scores.constructiveness,
                            score_tone: scores.tone,
                            ai_summary: scores.summary
                        });
                    }
                });
            }
        }
    }
});
