import { Context } from "grammy";
import { ChatMemberUpdated } from "grammy/types";
import { checkUserEligibility, generateEligibilityDMMessage } from "../../first-dollar";

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

    if (!scoreCheck.eligible) {
      console.log(
        `[MemberJoin] User ${scoreCheck.username} not eligible (score: ${scoreCheck.score}), removing from group`
      );

      try {
        // Kick the user (ban then immediately unban to allow rejoin later)
        await ctx.api.banChatMember(chatId, user.id);
        // Immediately unban so they can rejoin when their score improves
        await ctx.api.unbanChatMember(chatId, user.id);
        console.log(`[MemberJoin] Removed user ${user.id} from chat ${chatId}`);

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

      if (!scoreCheck.eligible) {
        console.log(
          `[MemberJoin] User ${scoreCheck.username} not eligible (score: ${scoreCheck.score}), removing from group`
        );

        try {
          // Kick the user
          await ctx.api.banChatMember(message.chat.id, newUser.id);
          await ctx.api.unbanChatMember(message.chat.id, newUser.id);
          console.log(`[MemberJoin] Removed user ${newUser.id} from chat ${message.chat.id}`);

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
      }
    }
  }
}
