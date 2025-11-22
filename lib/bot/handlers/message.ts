import { Context } from 'grammy';
import {
    createFeedback,
    getProjectByMessageId,
    getFeedbackByMessageId,
    getOrUpsertUser,
    findProjectByName,
    getActiveProjects,
    getProjectById,
    updateFeedbackScores
} from '../../supabase';
import { analyzeFeedback } from '../../ai';

export async function handleMessage(ctx: Context) {
    const message = ctx.message;
    if (!message) return;

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
        const { data: projects } = await getActiveProjects();
        if (projects) {
            for (const p of projects) {
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
}
