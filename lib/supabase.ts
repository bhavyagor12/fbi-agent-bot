import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!;
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- Users ---

export async function upsertUser(user: {
  telegram_user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}) {
  return await supabaseServer.from("users").upsert(user).select().single();
}

export async function getUser(telegram_user_id: number) {
  return await supabaseServer
    .from("users")
    .select("*")
    .eq("telegram_user_id", telegram_user_id)
    .single();
}

export async function getOrUpsertUser(user: {
  telegram_user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}) {
  const { data: existingUser } = await getUser(user.telegram_user_id);
  if (existingUser) return { data: existingUser, error: null };

  return await upsertUser(user);
}

// --- Projects ---

export async function createProject(project: {
  title: string;
  summary: string;
  telegram_message_id: number;
  user_message_id?: number;
  telegram_chat_id: number;
  user_id: number;
}) {
  return await supabaseServer
    .from("projects")
    .insert(project)
    .select()
    .single();
}

export async function getProjectByMessageId(messageId: number) {
  return await supabaseServer
    .from("projects")
    .select("*")
    .eq("telegram_message_id", messageId)
    .single();
}

export async function getProjectById(id: number) {
  return await supabaseServer
    .from("projects")
    .select(
      `
      id, 
      title, 
      summary, 
      feedback_summary,
      created_at,
      users(first_name, last_name, username),
      feedback(
        id, 
        content, 
        created_at,
        message_id,
        parent_message_id,
        media_url,
        media_type,
        score_relevance,
        score_depth,
        score_evidence,
        score_constructiveness,
        score_tone,
        score_originality,
        users(first_name, last_name, username, xp, tier)
      )
    `
    )
    .eq("id", id)
    .single();
}

export async function updateProjectFeedbackSummary(
  id: number,
  feedbackSummary: string
) {
  return await supabaseServer
    .from("projects")
    .update({ feedback_summary: feedbackSummary })
    .eq("id", id)
    .select()
    .single();
}

export async function getActiveProjects() {
  return await supabaseServer
    .from("projects")
    .select("id, title, summary, users(first_name, last_name, username)")
    .eq("status", "active");
}

export async function findProjectByName(name: string) {
  // Case-insensitive search
  return await supabaseServer
    .from("projects")
    .select("*")
    .ilike("title", name) // ilike is case-insensitive
    .single();
}

export async function searchActiveProjects(query: string) {
  return await supabaseServer
    .from("projects")
    .select("id, title, summary, users(first_name, last_name, username)")
    .eq("status", "active")
    .or(
      `title.ilike.%${query}%,summary.ilike.%${query}%,users.username.ilike.%${query}%,users.first_name.ilike.%${query}%,users.last_name.ilike.%${query}%`
    );
}

// --- Feedback ---

export async function createFeedback(feedback: {
  project_id: number;
  user_id: number;
  content: string;
  message_id: number;
  parent_message_id?: number;
  media_url?: string | null;
  media_type?: string | null;
  content_embedding?: number[];
}) {
  return await supabaseServer
    .from("feedback")
    .insert(feedback)
    .select()
    .single();
}

export async function updateFeedbackScores(
  id: number,
  scores: {
    score_relevance: number;
    score_depth: number;
    score_evidence: number;
    score_constructiveness: number;
    score_tone: number;
    score_originality?: number;
  }
) {
  console.log(`Updating feedback ${id} with scores:`, scores);
  const result = await supabaseServer
    .from("feedback")
    .update(scores)
    .eq("id", id);

  if (result.error) {
    console.error(`Error updating feedback ${id} scores:`, result.error);
  } else {
    console.log(`Successfully updated feedback ${id} with scores`);
  }

  return result;
}

export async function getFeedbackByProjectId(projectId: number) {
  return await supabaseServer
    .from("feedback")
    .select("*")
    .eq("project_id", projectId);
}

export async function getFeedbackByMessageId(messageId: number) {
  return await supabaseServer
    .from("feedback")
    .select("*")
    .eq("message_id", messageId)
    .single();
}

/**
 * Find similar feedback using vector similarity search
 * Returns the most similar feedback items with their similarity scores
 */
export async function findSimilarFeedback(
  projectId: number,
  embedding: number[],
  limit: number = 5
) {
  // Use RPC to call a Postgres function that does vector similarity search
  // The function should return similarity scores directly
  return await supabaseServer.rpc("match_feedback", {
    query_embedding: embedding,
    match_project_id: projectId,
    match_count: limit,
  });
}

/**
 * Update feedback with embedding vector
 */
export async function updateFeedbackEmbedding(id: number, embedding: number[]) {
  return await supabaseServer
    .from("feedback")
    .update({ content_embedding: embedding })
    .eq("id", id);
}

// --- XP Management ---

/**
 * Update a user's XP and recalculate their tier
 */
export async function updateUserXP(userId: number, xpToAdd: number) {
  // Import here to avoid circular dependencies
  const { calculateTier } = await import("./xp");

  // Get current user
  const { data: user, error: getUserError } = await getUser(userId);
  if (getUserError || !user) {
    console.error("Error getting user for XP update:", getUserError);
    return { data: null, error: getUserError };
  }

  // Calculate new XP
  const newXP = (user.xp || 0) + xpToAdd;
  const newTier = calculateTier(newXP);

  console.log(
    `Updating user ${userId}: ${
      user.xp || 0
    } + ${xpToAdd} = ${newXP} XP (${newTier} tier)`
  );

  // Update user
  const result = await supabaseServer
    .from("users")
    .update({ xp: newXP, tier: newTier })
    .eq("telegram_user_id", userId);

  if (result.error) {
    console.error("Error updating user XP:", result.error);
  }

  return result;
}

/**
 * Get a user's current XP and tier
 */
export async function getUserXPAndTier(userId: number) {
  return await supabaseServer
    .from("users")
    .select("xp, tier")
    .eq("telegram_user_id", userId)
    .single();
}
