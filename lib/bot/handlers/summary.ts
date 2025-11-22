import { Context } from 'grammy';
import { getProjectByMessageId, getFeedbackByProjectId } from '../../supabase';

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
}
