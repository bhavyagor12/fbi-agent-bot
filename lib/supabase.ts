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
  profile_picture_url?: string;
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

// Get user by username
export async function getUserByUsername(username: string) {
  if (!username) return { data: null, error: null };
  return await supabaseServer
    .from("users")
    .select("*")
    .eq("username", username)
    .single();
}

// Get user by email
export async function getUserByEmail(email: string) {
  if (!email) return { data: null, error: null };
  return await supabaseServer
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();
}

export async function getOrUpsertUser(user: {
  telegram_user_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
}) {
  // First check if user exists by telegram_user_id
  const { data: existingUserByTelegramId } = await getUser(user.telegram_user_id);
  if (existingUserByTelegramId) {
    // Update user info if needed
    const updates: any = {};
    if (user.username && user.username !== existingUserByTelegramId.username) {
      updates.username = user.username;
    }
    if (user.first_name && user.first_name !== existingUserByTelegramId.first_name) {
      updates.first_name = user.first_name;
    }
    if (user.last_name && user.last_name !== existingUserByTelegramId.last_name) {
      updates.last_name = user.last_name;
    }
    if (user.profile_picture_url && user.profile_picture_url !== existingUserByTelegramId.profile_picture_url) {
      updates.profile_picture_url = user.profile_picture_url;
    }

    if (Object.keys(updates).length > 0) {
      const { data: updatedUser } = await supabaseServer
        .from("users")
        .update(updates)
        .eq("id", existingUserByTelegramId.id)
        .select()
        .single();
      return { data: updatedUser || existingUserByTelegramId, error: null };
    }

    return { data: existingUserByTelegramId, error: null };
  }

  // If no user found by telegram_user_id, check by username
  if (user.username) {
    const { data: existingUserByUsername } = await getUserByUsername(user.username);
    if (existingUserByUsername) {
      // User exists with same username
      // If they don't have a telegram_user_id, add it
      // If they have a different telegram_user_id, just update profile info
      const updates: any = {
        first_name: user.first_name || existingUserByUsername.first_name,
        last_name: user.last_name || existingUserByUsername.last_name,
        ...(user.profile_picture_url && { profile_picture_url: user.profile_picture_url }),
      };

      // Only update telegram_user_id if the existing user doesn't have one
      // (due to unique constraint, we can't update if they have a different one)
      if (!existingUserByUsername.telegram_user_id) {
        updates.telegram_user_id = user.telegram_user_id;
      }

      const { data: updatedUser, error } = await supabaseServer
        .from("users")
        .update(updates)
        .eq("id", existingUserByUsername.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating user by username:", error);
        // If update fails due to constraint, just return the existing user
        return { data: existingUserByUsername, error: null };
      }

      return { data: updatedUser || existingUserByUsername, error: null };
    }
  }

  // No existing user found, create new one
  return await upsertUser(user);
}

// Get or create user by wallet address
export async function getOrUpsertUserByWallet(
  walletAddress: string,
  profile?: {
    username?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  }
) {
  // Normalize to lowercase for consistent storage and lookup
  const normalizedAddress = walletAddress.toLowerCase();

  // First check if user exists by wallet address
  const { data: existingUserByWallet } = await getUserByWallet(normalizedAddress);
  if (existingUserByWallet) {
    // Update profile info if provided
    if (profile && (profile.username || profile.first_name || profile.last_name || profile.email)) {
      const updates: any = {};
      if (profile.username && profile.username !== existingUserByWallet.username) {
        updates.username = profile.username;
      }
      if (profile.first_name && profile.first_name !== existingUserByWallet.first_name) {
        updates.first_name = profile.first_name;
      }
      if (profile.last_name && profile.last_name !== existingUserByWallet.last_name) {
        updates.last_name = profile.last_name;
      }
      if (profile.email && profile.email !== existingUserByWallet.email) {
        updates.email = profile.email;
      }

      if (Object.keys(updates).length > 0) {
        const { data: updatedUser } = await supabaseServer
          .from("users")
          .update(updates)
          .eq("id", existingUserByWallet.id)
          .select()
          .single();
        return { data: updatedUser || existingUserByWallet, error: null };
      }
    }
    return { data: existingUserByWallet, error: null };
  }

  // If no user found by wallet, check by username if provided
  if (profile?.username) {
    const { data: existingUserByUsername } = await getUserByUsername(profile.username);
    if (existingUserByUsername) {
      // User exists with same username but different/no wallet address
      // Update that user with the wallet address and other profile info
      const updates: any = {
        wallet_address: normalizedAddress,
        first_name: profile.first_name || existingUserByUsername.first_name,
        last_name: profile.last_name || existingUserByUsername.last_name,
        ...(profile.email && { email: profile.email }),
      };

      const { data: updatedUser, error } = await supabaseServer
        .from("users")
        .update(updates)
        .eq("id", existingUserByUsername.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating user by username:", error);
        // If update fails, fall through to create new user
      } else if (updatedUser) {
        return { data: updatedUser, error: null };
      }
    }
  }

  // No existing user found, create new one
  return await supabaseServer
    .from("users")
    .insert({
      wallet_address: normalizedAddress,
      ...profile,
    })
    .select()
    .single();
}

// Get user by wallet address
export async function getUserByWallet(walletAddress: string) {
  // Normalize to lowercase for consistent lookup
  const normalizedAddress = walletAddress.toLowerCase();
  return await supabaseServer
    .from("users")
    .select("*")
    .eq("wallet_address", normalizedAddress)
    .single();
}

// Get or create user by email address
export async function getOrUpsertUserByEmail(
  email: string,
  profile?: {
    username?: string;
    first_name?: string;
    last_name?: string;
    wallet_address?: string;
  }
) {
  const normalizedEmail = email.toLowerCase();

  // First check if user exists by email
  const { data: existingUser } = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    // Update profile info if provided
    if (profile && (profile.username || profile.first_name || profile.last_name || profile.wallet_address)) {
      const updates: any = {};
      if (profile.username && profile.username !== existingUser.username) {
        updates.username = profile.username;
      }
      if (profile.first_name && profile.first_name !== existingUser.first_name) {
        updates.first_name = profile.first_name;
      }
      if (profile.last_name && profile.last_name !== existingUser.last_name) {
        updates.last_name = profile.last_name;
      }
      if (profile.wallet_address && profile.wallet_address !== existingUser.wallet_address) {
        updates.wallet_address = profile.wallet_address.toLowerCase();
      }

      if (Object.keys(updates).length > 0) {
        const { data: updatedUser } = await supabaseServer
          .from("users")
          .update(updates)
          .eq("id", existingUser.id)
          .select()
          .single();
        return { data: updatedUser || existingUser, error: null };
      }
    }
    return { data: existingUser, error: null };
  }

  // No existing user found, create new one
  return await supabaseServer
    .from("users")
    .insert({
      email: normalizedEmail,
      ...profile,
      ...(profile?.wallet_address && { wallet_address: profile.wallet_address.toLowerCase() }),
    })
    .select()
    .single();
}

// Link Telegram account to wallet
export async function linkTelegramToWallet(
  telegramUserId: number,
  walletAddress: string
) {
  // Normalize to lowercase for consistent lookup
  const normalizedAddress = walletAddress.toLowerCase();

  // First check if wallet user exists
  const { data: walletUser } = await getUserByWallet(normalizedAddress);
  if (!walletUser) {
    return { data: null, error: new Error("Wallet user not found") };
  }

  // Update user with telegram_user_id
  return await supabaseServer
    .from("users")
    .update({ telegram_user_id: telegramUserId })
    .eq("wallet_address", normalizedAddress)
    .select()
    .single();
}

// Update user profile
export async function updateUserProfile(
  userId: number,
  profile: {
    username?: string;
    first_name?: string;
    last_name?: string;
    wallet_address?: string;
  }
) {
  // Normalize wallet address if provided
  if (profile.wallet_address) {
    profile.wallet_address = profile.wallet_address.toLowerCase();
  }
  return await supabaseServer
    .from("users")
    .update(profile)
    .eq("id", userId)
    .select()
    .single();
}

// Get user profile by ID
export async function getUserProfile(userId: number) {
  return await supabaseServer
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
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

export async function getProjectByForumTopicId(forumTopicId: number) {
  return await supabaseServer
    .from("projects")
    .select("*")
    .eq("forum_topic_id", forumTopicId)
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
      user_id,
      users(first_name, last_name, username),
      project_attachments(
        id,
        url,
        media_type
      ),
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

// Renamed to GetAllProjects since we don't have statuses anymore
export async function getAllProjects() {
  return await supabaseServer
    .from("projects")
    .select(
      "id, title, summary, user_id, feedback_summary, created_at, users(first_name, last_name, username), project_attachments(id, url, media_type)"
    )
    .order("created_at", { ascending: false });
}

export async function getInReviewProjects() {
  return await supabaseServer
    .from("projects")
    .select(
      "id, title, summary, user_id, feedback_summary, created_at, users(first_name, last_name, username), project_attachments(id, url, media_type)"
    )
    .eq("status", "in_review")
    .order("created_at", { ascending: false });
}

export async function getArchivedProjects() {
  return await supabaseServer
    .from("projects")
    .select(
      "id, title, summary, user_id, feedback_summary, created_at, users(first_name, last_name, username), project_attachments(id, url, media_type)"
    )
    .eq("status", "archived")
    .order("created_at", { ascending: false });
}

export async function acceptProject(id: number) {
  return await supabaseServer
    .from("projects")
    .update({ status: "active" })
    .eq("id", id)
    .select()
    .single();
}

export async function rejectProject(id: number) {
  return await supabaseServer
    .from("projects")
    .update({ status: "archived" })
    .eq("id", id)
    .select()
    .single();
}

export async function restoreProjectToReview(id: number) {
  return await supabaseServer
    .from("projects")
    .update({ status: "in_review" })
    .eq("id", id)
    .select()
    .single();
}

export async function findProjectByName(name: string) {
  // Case-insensitive search
  return await supabaseServer
    .from("projects")
    .select("*")
    .ilike("title", name) // ilike is case-insensitive
    .single();
}

export async function searchProjects(query: string) {
  return await supabaseServer
    .from("projects")
    .select(
      "id, title, summary, user_id, feedback_summary, users(first_name, last_name, username), project_attachments(id, url, media_type)"
    )
    .or(
      `title.ilike.%${query}%,summary.ilike.%${query}%,users.username.ilike.%${query}%,users.first_name.ilike.%${query}%,users.last_name.ilike.%${query}%`
    );
}

// Create project with attachments
export async function createProjectWithAttachments(
  project: {
    title: string;
    summary: string;
    user_id: number;
  },
  attachmentUrls: Array<{ url: string; media_type: string }>
) {
  // Create project first - set status to 'active' (no more project-level approval)
  const { data: newProject, error: projectError } = await supabaseServer
    .from("projects")
    .insert({ ...project })
    .select()
    .single();

  if (projectError || !newProject) {
    return { data: null, error: projectError };
  }

  // If there are attachments, create them
  if (attachmentUrls.length > 0) {
    const attachments = attachmentUrls.map((att) => ({
      project_id: newProject.id,
      url: att.url,
      media_type: att.media_type,
    }));

    const { error: attachmentError } = await supabaseServer
      .from("project_attachments")
      .insert(attachments);

    if (attachmentError) {
      console.error("Error creating attachments:", attachmentError);
      // Project was created but attachments failed
      return { data: newProject, error: attachmentError };
    }
  }

  return { data: newProject, error: null };
}

// Get projects by user ID
export async function getProjectsByUserId(userId: number) {
  return await supabaseServer
    .from("projects")
    .select("id, title, summary, created_at, feedback_summary")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

// Update project summary
export async function updateProjectSummary(projectId: number, summary: string) {
  return await supabaseServer
    .from("projects")
    .update({ feedback_summary: summary })
    .eq("id", projectId)
    .select()
    .single();
}

// --- Feedback ---

export async function createFeedback(feedback: {
  project_id: number;
  user_id: number;
  content: string;
  message_id: number;
  parent_message_id?: number;
  reply_to_content?: string | null;
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
    `Updating user ${userId}: ${user.xp || 0
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
 * Update a user's XP by internal user ID (for wallet-based users)
 */
export async function updateUserXPById(
  internalUserId: number,
  xpToAdd: number
) {
  // Import here to avoid circular dependencies
  const { calculateTier } = await import("./xp");

  // Get current user by internal ID
  const { data: user, error: getUserError } = await supabaseServer
    .from("users")
    .select("*")
    .eq("id", internalUserId)
    .single();

  if (getUserError || !user) {
    console.error("Error getting user for XP update:", getUserError);
    return { data: null, error: getUserError };
  }

  // Calculate new XP
  const newXP = (user.xp || 0) + xpToAdd;
  const newTier = calculateTier(newXP);

  console.log(
    `Updating user ${internalUserId}: ${user.xp || 0
    } + ${xpToAdd} = ${newXP} XP (${newTier} tier)`
  );

  // Update user by internal ID
  const result = await supabaseServer
    .from("users")
    .update({ xp: newXP, tier: newTier })
    .eq("id", internalUserId);

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

export async function getUserStats(userId: number) {
  const { count: projectCount } = await supabaseServer
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: feedbackCount } = await supabaseServer
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    projectCount: projectCount || 0,
    feedbackCount: feedbackCount || 0,
  };
}

// --- Whitelist Management ---

/**
 * Check if a wallet address is whitelisted
 */
export async function isWalletWhitelisted(walletAddress: string) {
  const { data, error } = await supabaseServer
    .from("whitelist")
    .select("id")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  return { isWhitelisted: !!data && !error, error };
}

// --- User Approval Management ---

/**
 * Get all unapproved users (with email)
 */
export async function getUnapprovedUsers() {
  return await supabaseServer
    .from("users")
    .select("*")
    .eq("approved", false)
    .not("email", "is", null)
    .order("created_at", { ascending: false });
}

/**
 * Get all approved users (with email)
 */
export async function getApprovedUsers() {
  return await supabaseServer
    .from("users")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });
}

/**
 * Approve a user by their ID
 */
export async function approveUser(userId: number) {
  return await supabaseServer
    .from("users")
    .update({ approved: true })
    .eq("id", userId)
    .select()
    .single();
}

/**
 * Revoke approval from a user
 */
export async function revokeUserApproval(userId: number) {
  return await supabaseServer
    .from("users")
    .update({ approved: false })
    .eq("id", userId)
    .select()
    .single();
}

/**
 * Check if a user is approved
 */
export async function isUserApproved(userId: number) {
  const { data, error } = await supabaseServer
    .from("users")
    .select("approved")
    .eq("id", userId)
    .single();

  return { isApproved: data?.approved === true, error };
}
