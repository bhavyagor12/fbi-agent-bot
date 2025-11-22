import { Context } from 'grammy';
import { createProject, getOrUpsertUser } from '../../supabase';

export async function handleStartProject(ctx: Context) {
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

    if (!ctx.from || !ctx.chat) {
        return ctx.reply('Could not identify user or chat.');
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
}
