import { Context } from "grammy";
import {
  createFeedback,
  getProjectByMessageId,
  getProjectByForumTopicId,
  getFeedbackByMessageId,
  getOrUpsertUser,
  findProjectByName,
  getAllProjects,
  getProjectById,
  updateFeedbackScores,
  updateUserXP,
  findSimilarFeedback,
  updateFeedbackEmbedding,
  updateUserProfile,
} from "../../supabase";
import { calculateFeedbackXP } from "../../xp";
import { analyzeFeedback } from "../../ai";
import { generateEmbedding, isFeedbackOriginal } from "../../embeddings";
import { getTelegramProfilePicture } from "../utils/profile-picture";

type SimilarFeedback = {
  id: number;
  content: string;
  created_at: string;
  similarity: number;
};

export async function handleMessage(ctx: Context) {
  const message = ctx.message;
  if (!message) return;

  // Skip commands - they are handled by command handlers
  if (message.text?.startsWith("/")) {
    return;
  }

  const replyTo = message.reply_to_message;
  const text = message.text || message.caption || "";

  if (!message.from) return;

  // Skip messages from the bot itself
  if (message.from.id === ctx.me.id) {
    return;
  }

  // Upsert User (always good to keep user data fresh)
  // First get existing user to check if we need to fetch profile picture
  let profilePictureUrl: string | undefined;

  // Fetch profile picture for first-time users or if not yet stored
  // We do this async to not block the message handling
  const existingUser = await getOrUpsertUser({
    telegram_user_id: message.from.id,
    username: message.from.username,
    first_name: message.from.first_name,
    last_name: message.from.last_name,
  });

  // If user doesn't have a profile picture stored, try to fetch it
  if (existingUser.data && !existingUser.data.profile_picture_url) {
    profilePictureUrl = await getTelegramProfilePicture(message.from.id) || undefined;

    // Update user with profile picture if we got one
    if (profilePictureUrl) {
      await getOrUpsertUser({
        telegram_user_id: message.from.id,
        username: message.from.username,
        first_name: message.from.first_name,
        last_name: message.from.last_name,
        profile_picture_url: profilePictureUrl,
      });
    }
  }

  const { data: user, error: userError } = existingUser;

  if (userError || !user) {
    console.error("Error getting/creating user:", userError);
    return;
  }

  // Handle private/DM messages for wallet address collection
  if (message.chat.type === "private") {
    const replyTo = message.reply_to_message;

    // Check if this is a reply to the bot's wallet address request
    if (
      replyTo &&
      replyTo.from?.id === ctx.me.id &&
      replyTo.text?.includes("wallet address")
    ) {
      // User is replying with their wallet address
      const walletAddress = text.trim();

      // Validate Ethereum address format (0x followed by 40 hex characters)
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);

      if (isValidAddress) {
        // Save the wallet address
        const { error: updateError } = await updateUserProfile(user.id, {
          wallet_address: walletAddress,
        });

        if (updateError) {
          console.error("Error updating wallet address:", updateError);
          await ctx.reply(
            "❌ Sorry, there was an error saving your wallet address. Please try again.",
            { parse_mode: "Markdown" }
          );
        } else {
          console.log(`[WALLET] Saved wallet address ${walletAddress} for user ${user.id}`);
          await ctx.reply(
            `✅ Your wallet address has been saved!\n\n\`${walletAddress}\`\n\nYour Telegram account is now linked to this wallet.`,
            { parse_mode: "Markdown" }
          );
        }
        return; // Message handled, don't process further
      } else {
        // Invalid address format
        await ctx.reply(
          "❌ That doesn't look like a valid Ethereum address. Please send a valid address starting with `0x` (42 characters total).",
          {
            parse_mode: "Markdown",
            reply_markup: { force_reply: true }
          }
        );
        return;
      }
    }

    // If user doesn't have a wallet address, prompt them
    if (!user.wallet_address) {
      await ctx.reply(
        "👋 Welcome! To link your account, please reply to this message with your Ethereum wallet address.\n\nExample: `0x1234...abcd`",
        {
          parse_mode: "Markdown",
          reply_markup: { force_reply: true }
        }
      );
      return;
    }

    // User has wallet but not replying to wallet request - just acknowledge
    await ctx.reply(
      `👋 Hello! Your wallet is already linked: \`${user.wallet_address}\`\n\nUse /help to see available commands.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  let projectId: number | null = null;

  // Case 0: Check if message is in a forum topic (NEW)
  // In forum topics, message_thread_id is set to the topic ID
  // Try to access it from the message object or from the update
  const messageThreadId =
    (message as any).message_thread_id ??
    (ctx.update.message as any)?.message_thread_id;

  console.log(
    `[DEBUG] Message ID: ${message.message_id}, Thread ID: ${messageThreadId || "none"
    }, Chat ID: ${message.chat.id}, Chat Type: ${message.chat.type}`
  );

  if (messageThreadId) {
    console.log(`[DEBUG] Message is in forum topic ${messageThreadId}`);
    const { data: project, error: topicError } = await getProjectByForumTopicId(
      messageThreadId
    );

    if (topicError) {
      console.error(
        `[ERROR] Failed to lookup project by forum topic:`,
        topicError
      );
    }

    if (project) {
      projectId = project.id;
      console.log(
        `[INFO] Found project ${projectId} from forum topic ${messageThreadId}`
      );
    } else {
      console.log(
        `[DEBUG] No project found for forum topic ${messageThreadId}, checking reply...`
      );
      // Also check if replying to project root message in forum topic
      if (replyTo) {
        const { data: projectFromReply } = await getProjectByMessageId(
          replyTo.message_id
        );
        if (projectFromReply) {
          projectId = projectFromReply.id;
          console.log(
            `[INFO] Found project ${projectId} from reply to message ${replyTo.message_id} in forum topic`
          );
        }
      }
    }
  }

  // Case 1: Reply to a message (EXISTING - fallback for non-topic groups)
  if (!projectId && replyTo) {
    // 1a. Check if replying to a project root message
    const { data: project } = await getProjectByMessageId(replyTo.message_id);
    if (project) {
      projectId = project.id;
    } else {
      // 1b. Check if replying to another feedback
      const { data: parentFeedback } = await getFeedbackByMessageId(
        replyTo.message_id
      );
      if (parentFeedback) {
        projectId = parentFeedback.project_id;
      } else {
        // 1c. Check if replying to the bot's "Send feedback for X" message
        if (
          replyTo.from?.id === ctx.me.id &&
          replyTo.text?.includes("feedback for")
        ) {
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

  // Case 2: No reply and not in topic, check for project name mention (EXISTING)
  if (!projectId && text) {
    // Get all active projects to check against
    const { data: projects } = await getAllProjects();
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

  // Check if message is from project owner - skip recording their feedback
  const { data: project } = await getProjectById(projectId);
  if (project && project.user_id === user.id) {
    console.log(`Message from project owner (user_id: ${user.id}), skipping feedback recording`);
    return;
  }

  // Check if feedback with this message_id already exists
  const { data: existingFeedback, error: existingError } = await getFeedbackByMessageId(message.message_id);
  if (existingFeedback && !existingError) {
    console.log(`Feedback with message_id ${message.message_id} already exists, skipping duplicate`);
    return;
  }

  // Store Feedback
  let mediaUrl = null;
  let mediaType = null;

  if (message.photo) {
    mediaType = "photo";
    // Get largest photo
    mediaUrl = message.photo[message.photo.length - 1].file_id;
  } else if (message.document) {
    mediaType = "document";
    mediaUrl = message.document.file_id;
  }

  // Capture the content of the message being replied to (for chain of thought)
  const replyToContent = replyTo ? (replyTo.text || replyTo.caption || null) : null;

  const { data: savedFeedback, error } = await createFeedback({
    project_id: projectId,
    user_id: user.id,
    content: text,
    message_id: message.message_id,
    parent_message_id: replyTo?.message_id,
    reply_to_content: replyToContent,
    media_url: mediaUrl,
    media_type: mediaType,
  });

  if (error) {
    console.error("Error saving feedback:", error);
  } else {
    // Run AI Analysis and Semantic Similarity Check
    // IMPORTANT: We await this to ensure it completes before the webhook response is sent
    // In serverless environments, the execution context can be terminated after response
    if (!savedFeedback) {
      console.error("[AI] No savedFeedback returned, skipping AI processing");
      return;
    }

    if (!text || text.trim().length === 0) {
      console.log("[AI] No text content in feedback, skipping AI processing");
      return;
    }

    // Fetch project context (summary)
    const { data: project, error: projectError } = await getProjectById(
      projectId
    );
    if (projectError) {
      console.error(
        "[AI] Error fetching project for AI processing:",
        projectError
      );
      return;
    }

    if (!project) {
      console.error(
        `[AI] Project ${projectId} not found, skipping AI processing`
      );
      return;
    }

    console.log(
      `[AI] Starting AI processing for feedback ${savedFeedback.id} on project ${projectId}`
    );

    try {
      // Run both AI analysis and embedding generation in parallel
      // AWAIT THIS to ensure completion in serverless environments
      const [scores, embedding] = await Promise.all([
        analyzeFeedback(text, project.summary || "", !!mediaUrl),
        generateEmbedding(text),
      ]);

      console.log(
        `[AI] AI processing complete for feedback ${savedFeedback.id}`
      );
      console.log(`[AI] Scores:`, scores);
      console.log(`[AI] Embedding generated:`, !!embedding);

      if (!scores) {
        console.error("[AI] Failed to analyze feedback - no scores returned");
        return;
      }

      // Check if feedback is original using semantic similarity
      let isOriginal = true; // Default to original if we can't check

      if (embedding) {
        // Store the embedding
        const { error: embeddingError } = await updateFeedbackEmbedding(
          savedFeedback.id,
          embedding
        );
        if (embeddingError) {
          console.error(
            "[AI] Error updating feedback embedding:",
            embeddingError
          );
        } else {
          console.log(`[AI] Embedding stored for feedback ${savedFeedback.id}`);
        }

        // Use Supabase's built-in vector similarity search
        const { data: similarFeedback, error: similarityError } =
          await findSimilarFeedback(projectId, embedding, 5);

        if (similarityError) {
          console.error(
            "[AI] Error finding similar feedback:",
            similarityError
          );
        } else if (similarFeedback && similarFeedback.length > 0) {
          // Filter out the current feedback (it might match itself)
          const otherFeedback = (similarFeedback as SimilarFeedback[]).filter(
            (f) => f.id !== savedFeedback.id
          );

          if (otherFeedback.length > 0) {
            // Use the similarity scores directly from the search results
            const similarities = otherFeedback.map((f) => f.similarity);

            isOriginal = isFeedbackOriginal(similarities);
            console.log(
              `[AI] Feedback is ${isOriginal ? "original" : "not original"} (based on top ${similarities.length} matches)`
            );
            console.log(
              `[AI] Top similarities: ${similarities
                .slice(0, 3)
                .map((s: number) => s.toFixed(3))
                .join(", ")}`
            );
          }
        }
      } else {
        console.warn(
          "[AI] Failed to generate embedding, assuming feedback is original"
        );
      }

      // Update feedback scores (without originality)
      const { error: scoresError } = await updateFeedbackScores(
        savedFeedback.id,
        {
          score_relevance: scores.relevance,
          score_depth: scores.depth,
          score_evidence: scores.evidence,
          score_constructiveness: scores.constructiveness,
          score_tone: scores.tone,
        }
      );

      if (scoresError) {
        console.error("[AI] Error updating feedback scores:", scoresError);
      } else {
        console.log(`[AI] Scores updated for feedback ${savedFeedback.id}`);
      }

      // Award XP for feedback (originality check is done here, not as a score)
      const feedbackXP = calculateFeedbackXP(
        {
          relevance: scores.relevance,
          depth: scores.depth,
          evidence: scores.evidence,
          constructiveness: scores.constructiveness,
          tone: scores.tone,
        },
        isOriginal
      );

      if (feedbackXP > 0) {
        await updateUserXP(message.from.id, feedbackXP);
        console.log(
          `[AI] Awarded ${feedbackXP} XP to user ${message.from.id} for feedback`
        );
      } else {
        console.log(
          `[AI] No XP awarded to user ${message.from.id} - feedback is not original (too similar to existing feedback)`
        );
      }
    } catch (error) {
      console.error("[AI] Error in feedback processing:", error);
      console.error(
        "[AI] Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
    }
  }
}
