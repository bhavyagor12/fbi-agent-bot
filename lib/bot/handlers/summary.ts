import { Context } from 'grammy';
import { getProjectByMessageId, getFeedbackByProjectId, updateProjectFeedbackSummary } from '../../supabase';
import { summarizeFeedback } from '../../ai';

// Track ongoing summary generations to prevent duplicates
const ongoingSummaries = new Set<number>();

export async function handleSummaryCommand(ctx: Context) {
    if (!ctx.message?.reply_to_message) {
        return ctx.reply('Please reply to a project message to get a summary.');
    }

    const replyToId = ctx.message.reply_to_message.message_id;

    // Find the project associated with this message
    const { data: project, error } = await getProjectByMessageId(replyToId);

    if (error || !project) {
        return ctx.reply('Project not found. Make sure you are replying to the original project post.');
    }

    // Check if the user is the project owner
    if (!ctx.message?.from || project.user_id !== ctx.message.from.id) {
        return ctx.reply('❌ Only the project owner can generate summaries.');
    }

    // Fetch all feedback
    const { data: feedback, error: feedbackError } = await getFeedbackByProjectId(project.id);

    if (feedbackError) {
        return ctx.reply("Error fetching feedback.");
    }

    if (!feedback || feedback.length === 0) {
        return ctx.reply("No feedback found for this project yet.");
    }

    // Check if summary is already being generated for this project
    if (ongoingSummaries.has(project.id)) {
        return ctx.reply("⏳ A summary is already being generated for this project. Please wait...");
    }

    // Mark this project as having an ongoing summary generation
    ongoingSummaries.add(project.id);

    // Show loading message
    let loadingMsg;
    try {
        loadingMsg = await ctx.reply("🤖 Generating AI summary...", { parse_mode: 'Markdown' });
    } catch (error) {
        ongoingSummaries.delete(project.id);
        console.error("Error sending loading message:", error);
        return;
    }

    try {
        // Generate AI summary
        const summary = await summarizeFeedback(feedback);

        if (!summary) {
            try {
                await ctx.api.editMessageText(
                    loadingMsg.chat.id,
                    loadingMsg.message_id,
                    `📊 *Summary for ${project.title}*\n\nFound ${feedback.length} feedback items.\n\n❌ Failed to generate AI summary.`,
                    { parse_mode: 'Markdown' }
                );
            } catch (editError) {
                console.error("Error editing message:", editError);
            }
            return;
        }

        // Format the summary for Telegram
        let summaryText = `📊 *Summary for ${project.title}*\n\n`;
        summaryText += `_${feedback.length} feedback item${feedback.length > 1 ? 's' : ''} analyzed_\n\n`;
        summaryText += `📝 *Summary:*\n${summary}`;

        // Telegram has a 4096 character limit, so truncate if needed
        if (summaryText.length > 4096) {
            summaryText = summaryText.substring(0, 4090) + '...';
        }

        // Save only the summary text to the project table
        await updateProjectFeedbackSummary(project.id, summary);

        await ctx.api.editMessageText(
            loadingMsg.chat.id,
            loadingMsg.message_id,
            summaryText,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error("Error generating summary:", error);
        try {
            await ctx.api.editMessageText(
                loadingMsg.chat.id,
                loadingMsg.message_id,
                `📊 *Summary for ${project.title}*\n\nFound ${feedback.length} feedback items.\n\n❌ Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { parse_mode: 'Markdown' }
            );
        } catch (editError) {
            console.error("Error editing message:", editError);
        }
    } finally {
        // Always remove from ongoing set when done
        ongoingSummaries.delete(project.id);
    }
}
