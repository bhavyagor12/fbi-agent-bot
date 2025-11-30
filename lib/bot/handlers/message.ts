import { Context } from "grammy";
import {
  createFeedback,
  getProjectByMessageId,
  getProjectByForumTopicId,
  getFeedbackByMessageId,
  getOrUpsertUser,
  findProjectByName,
  getActiveProjects,
  getProjectById,
  updateFeedbackScores,
  updateUserXP,
  findSimilarFeedback,
  updateFeedbackEmbedding,
} from "../../supabase";
import { calculateFeedbackXP } from "../../xp";
import { analyzeFeedback } from "../../ai";
import { generateEmbedding, calculateOriginalityScore } from "../../embeddings";

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

  // Upsert User (always good to keep user data fresh)
  await getOrUpsertUser({
    telegram_user_id: message.from.id,
    username: message.from.username,
    first_name: message.from.first_name,
    last_name: message.from.last_name,
  });

  let projectId: number | null = null;

  // Case 0: Check if message is in a forum topic (NEW)
  // In forum topics, message_thread_id is set to the topic ID
  // Try to access it from the message object or from the update
  const messageThreadId =
    (message as any).message_thread_id ??
    (ctx.update.message as any)?.message_thread_id;

  console.log(
    `[DEBUG] Message ID: ${message.message_id}, Thread ID: ${
      messageThreadId || "none"
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
    mediaType = "photo";
    // Get largest photo
    mediaUrl = message.photo[message.photo.length - 1].file_id;
  } else if (message.document) {
    mediaType = "document";
    mediaUrl = message.document.file_id;
  }

  const { data: savedFeedback, error } = await createFeedback({
    project_id: projectId,
    user_id: message.from.id,
    content: text,
    message_id: message.message_id,
    parent_message_id: replyTo?.message_id,
    media_url: mediaUrl,
    media_type: mediaType,
  });

  if (error) {
    console.error("Error saving feedback:", error);
  } else {
    // React to confirm receipt
    try {
      await ctx.react("👍");
    } catch {
      // ignore
    }

    // Run AI Analysis and Semantic Similarity Check
    // IMPORTANT: We await this to ensure it completes before the webhook response is sent
    // In serverless environments, the execution context can be terminated after response
    if (savedFeedback && text) {
      // Fetch project context (summary)
      const { data: project } = await getProjectById(projectId);
      if (project) {
        try {
          console.log(
            `[AI] Starting feedback analysis for feedback ${savedFeedback.id}`
          );

          // Run both AI analysis and embedding generation in parallel
          const [scores, embedding] = await Promise.all([
            analyzeFeedback(text, project.summary, !!mediaUrl),
            generateEmbedding(text),
          ]);

          if (!scores) {
            console.error("[AI] Failed to analyze feedback - scores are null");
            return;
          }

          console.log(`[AI] Received scores:`, scores);

          // Calculate originality score using semantic similarity
          let originalityScore = 10; // Default for first feedback

          if (embedding) {
            // Store the embedding
            await updateFeedbackEmbedding(savedFeedback.id, embedding);
            console.log(
              `[AI] Stored embedding for feedback ${savedFeedback.id}`
            );

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
              const otherFeedback = (
                similarFeedback as SimilarFeedback[]
              ).filter((f) => f.id !== savedFeedback.id);

              if (otherFeedback.length > 0) {
                // Use the similarity scores directly from the search results
                const similarities = otherFeedback.map((f) => f.similarity);

                originalityScore = calculateOriginalityScore(similarities);
                console.log(
                  `[AI] Originality score: ${originalityScore} (based on top ${similarities.length} matches)`
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
              "[AI] Failed to generate embedding, using default originality score"
            );
          }

          // Update feedback scores including originality
          await updateFeedbackScores(savedFeedback.id, {
            score_relevance: scores.relevance,
            score_depth: scores.depth,
            score_evidence: scores.evidence,
            score_constructiveness: scores.constructiveness,
            score_tone: scores.tone,
            score_originality: originalityScore,
          });
          console.log(`[AI] Updated scores for feedback ${savedFeedback.id}`);

          // Award XP for feedback
          const feedbackXP = calculateFeedbackXP({
            relevance: scores.relevance,
            depth: scores.depth,
            evidence: scores.evidence,
            constructiveness: scores.constructiveness,
            tone: scores.tone,
            originality: originalityScore,
          });

          if (feedbackXP > 0) {
            await updateUserXP(message.from.id, feedbackXP);
            console.log(
              `[AI] Awarded ${feedbackXP} XP to user ${message.from.id} for feedback (originality: ${originalityScore})`
            );
          } else {
            console.log(
              `[AI] No XP awarded to user ${message.from.id} - originality too low (${originalityScore})`
            );
          }
        } catch (error) {
          console.error("[AI] Error in feedback processing:", error);
        }
      }
    }
  }
}
