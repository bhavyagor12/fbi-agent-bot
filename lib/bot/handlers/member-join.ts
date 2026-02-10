import { Context } from "grammy";
import { ChatMemberUpdated } from "grammy/types";
import { checkUserEligibility, generateEligibilityDMMessage } from "../../first-dollar";

const KICK_MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterSeconds(error: unknown): number | null {
  const maybeError = error as {
    error_code?: number;
    parameters?: { retry_after?: number };
  };
  if (
    maybeError?.error_code === 429 &&
    typeof maybeError?.parameters?.retry_after === "number"
  ) {
    return maybeError.parameters.retry_after;
  }
  return null;
}

async function kickUserWithRetry(
  ctx: Context,
  chatId: number,
  userId: number
): Promise<void> {
  for (let attempt = 1; attempt <= KICK_MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[MemberJoin] Kick attempt ${attempt}/${KICK_MAX_RETRIES} for user ${userId} in chat ${chatId}`
      );
      // Kick the user (ban then immediately unban to allow rejoin later)
      const banResponse = await ctx.api.banChatMember(chatId, userId);
      console.log(`[MemberJoin] banChatMember succeeded for user ${userId}, response:`, JSON.stringify(banResponse));
      const unbanResponse = await ctx.api.unbanChatMember(chatId, userId);
      console.log(`[MemberJoin] unbanChatMember succeeded for user ${userId}, response:`, JSON.stringify(unbanResponse));
      console.log(
        `[MemberJoin] Removed user ${userId} from chat ${chatId} on attempt ${attempt}`
      );
      return;
    } catch (error) {
      const retryAfter = getRetryAfterSeconds(error);
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);

      if (attempt >= KICK_MAX_RETRIES) {
        console.error(
          `[MemberJoin] Failed to remove user ${userId} after ${attempt} attempts:`,
          error
        );
        throw error;
      }

      const waitMs =
        retryAfter !== null
          ? (retryAfter + 1) * 1000
          : RETRY_BACKOFF_MS * attempt;

      if (retryAfter !== null) {
        console.warn(
          `[MemberJoin] Telegram rate limit hit for user ${userId}. retry_after=${retryAfter}s`
        );
      }
      console.warn(
        `[MemberJoin] Kick attempt ${attempt} failed for user ${userId} (${errorMessage}). Retrying in ${waitMs}ms`
      );
      await sleep(waitMs);
    }
  }
}

/**
 * Handles new members joining the group.
 * Checks their First Dollar eligibility and removes them if not eligible.
 */
export async function handleMemberJoin(ctx: Context) {
  const update = ctx.update;

  // Handle chat_member updates (user status changes in the chat)
  if ("chat_member" in update && update.chat_member) {
    const chatMember = update.chat_member as ChatMemberUpdated;
    const newMember = chatMember.new_chat_member;
    const user = newMember.user;
    const chatId = chatMember.chat.id;

    // Only process when someone becomes a member (not when leaving, getting banned, etc.)
    if (newMember.status !== "member" && newMember.status !== "restricted") {
      return;
    }

    // Skip bots
    if (user.is_bot) {
      return;
    }

    console.log(`[MemberJoin] User ${user.username || user.id} joined chat ${chatId}`);

    // Check First Dollar eligibility
    const scoreCheck = await checkUserEligibility(user.username);
    console.log(
      `[MemberJoin] Eligibility check for user ${user.id}: eligible=${scoreCheck.eligible}, score=${scoreCheck.score}, username=${scoreCheck.username}`
    );
    console.log("[MemberJoin] Eligibility response:", JSON.stringify(scoreCheck, null, 2));

    if (!scoreCheck.eligible) {
      console.log(
        `[MemberJoin] User ${scoreCheck.username} not eligible (score: ${scoreCheck.score}), removing from group`
      );

      try {
        await kickUserWithRetry(ctx, chatId, user.id);

        // Send DM explaining why they were removed
        try {
          const dmMessage = generateEligibilityDMMessage(scoreCheck.score);
          const fullMessage = `You were removed from the group because your First Dollar account is not eligible.\n\n${dmMessage}\n\nOnce you're eligible, you can rejoin the group.`;
          await ctx.api.sendMessage(user.id, fullMessage);
          console.log(`[MemberJoin] Sent eligibility DM to user ${user.id}`);
        } catch (dmError) {
          // User may not have started a conversation with the bot
          console.log(
            `[MemberJoin] Could not send DM to user ${user.id} (user may not have started bot conversation):`,
            dmError
          );
        }
      } catch (error) {
        console.error(`[MemberJoin] Failed to remove user ${user.id}:`, error);
      }
    } else {
      console.log(
        `[MemberJoin] User ${scoreCheck.username} eligible (score: ${scoreCheck.score}), allowing`
      );
      console.log(`[MemberJoin] No removal action needed for user ${user.id}`);
    }

    return;
  }

  // Handle message-based new member detection (for groups without chat_member updates enabled)
  const message = ctx.message;
  if (!message) return;

  // Check for new_chat_members in the message
  if (message.new_chat_members && message.new_chat_members.length > 0) {
    for (const newUser of message.new_chat_members) {
      // Skip bots
      if (newUser.is_bot) continue;

      console.log(`[MemberJoin] User ${newUser.username || newUser.id} joined via message event`);

      // Check First Dollar eligibility
      const scoreCheck = await checkUserEligibility(newUser.username);
      console.log(
        `[MemberJoin] Eligibility check (message event) for user ${newUser.id}: eligible=${scoreCheck.eligible}, score=${scoreCheck.score}, username=${scoreCheck.username}`
      );
      console.log("[MemberJoin] Eligibility response:", JSON.stringify(scoreCheck, null, 2));

      if (!scoreCheck.eligible) {
        console.log(
          `[MemberJoin] User ${scoreCheck.username} not eligible (score: ${scoreCheck.score}), removing from group`
        );

        try {
          await kickUserWithRetry(ctx, message.chat.id, newUser.id);

          // Send DM
          try {
            const dmMessage = generateEligibilityDMMessage(scoreCheck.score);
            const fullMessage = `You were removed from the group because your First Dollar account is not eligible.\n\n${dmMessage}\n\nOnce you're eligible, you can rejoin the group.`;
            await ctx.api.sendMessage(newUser.id, fullMessage);
            console.log(`[MemberJoin] Sent eligibility DM to user ${newUser.id}`);
          } catch (dmError) {
            console.log(
              `[MemberJoin] Could not send DM to user ${newUser.id}:`,
              dmError
            );
          }
        } catch (error) {
          console.error(`[MemberJoin] Failed to remove user ${newUser.id}:`, error);
        }
      } else {
        console.log(
          `[MemberJoin] User ${scoreCheck.username} eligible (score: ${scoreCheck.score}), allowing`
        );
        console.log(`[MemberJoin] No removal action needed for user ${newUser.id}`);
      }
    }
  }
}
