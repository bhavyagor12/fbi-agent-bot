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
        users(first_name, last_name, username)
      )
    `
    )
    .eq("id", id)
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
    ai_summary: string;
  }
) {
  return await supabaseServer.from("feedback").update(scores).eq("id", id);
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
