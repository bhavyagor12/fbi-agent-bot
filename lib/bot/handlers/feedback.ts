import { Context, InlineKeyboard } from 'grammy';
import { getActiveProjects, getProjectById } from '../../supabase';

export async function handleFeedbackCommand(ctx: Context) {
    const { data: projects, error } = await getActiveProjects();

    if (error || !projects || projects.length === 0) {
        return ctx.reply('No active projects found.');
    }

    const keyboard = new InlineKeyboard();
    projects.forEach((p) => {
        keyboard.text(p.title, `feedback_select:${p.id}`).row();
    });

    await ctx.reply('Select a project to give feedback on:', { reply_markup: keyboard });
}

export async function handleFeedbackSelection(ctx: Context) {
    if (!ctx.match) return;
    // ctx.match is RegExpMatchArray because we use regex trigger
    const projectId = (ctx.match as RegExpMatchArray)[1];
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
}
