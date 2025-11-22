import { bot } from '@/lib/telegram-bot';
import { webhookCallback } from 'grammy';

export const POST = webhookCallback(bot, 'std/http');
