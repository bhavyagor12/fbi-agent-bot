"use client";

import { MessageSquare, Award, ChevronRight, ArrowUpDown, Download, Pencil } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getScoreColor, getTierColor, UserTier } from "@/lib/colors";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/components/user-provider";
import { getUserByWallet } from "@/lib/supabase";
import GenerateSummaryButton from "@/components/generate-summary-button";
import ProjectAttachmentsCarousel from "@/components/project-attachments-carousel";
import { calculateFeedbackXP } from "@/lib/xp";
import CreateProjectForm from "@/components/create-project-form";
import { extractProjectFields } from "@/lib/utils";

// Extended Project Interface
interface UserInfo {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  xp?: number | null;
  tier?: string | null;
  profile_picture_url?: string | null;
}

interface ProjectAttachment {
  id: number;
  url: string;
  media_type: string;
}

interface Feedback {
  id: number;
  content: string | null;
  created_at: string;
  message_id: number;
  parent_message_id: number | null;
  reply_to_content: string | null;
  media_url: string | null;
  media_type: string | null;
  score_relevance: number | null;
  score_depth: number | null;
  score_evidence: number | null;
  score_constructiveness: number | null;
  score_tone: number | null;
  score_originality: number | null;
  users: UserInfo;
}

// Interface for grouping feedbacks by user
interface GroupedUserFeedback {
  userId: number | null;
  user: UserInfo;
  feedbacks: Feedback[];
  feedbackCount: number;
}

interface ProjectDetails {
  id: number;
  title: string;
  summary: string | null;
  feedback_summary: string | null;
  created_at: string;
  user_id: number;
  users: UserInfo;
  project_attachments?: ProjectAttachment[];
  feedback: Feedback[];
}

// Helper functions
const getUserDisplayName = (user: UserInfo | null): string => {
  if (!user) return "Unknown User";
  const firstName = user.first_name || "";
  const lastName = user.last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  return fullName || user.username || "Unknown User";
};

// Calculate XP for a single feedback from its scores
const getFeedbackXP = (feedback: Feedback): number => {
  if (
    feedback.score_relevance === null ||
    feedback.score_depth === null ||
    feedback.score_evidence === null ||
    feedback.score_constructiveness === null ||
    feedback.score_tone === null
  ) {
    return 0;
  }

  return calculateFeedbackXP(
    {
      relevance: feedback.score_relevance,
      depth: feedback.score_depth,
      evidence: feedback.score_evidence,
      constructiveness: feedback.score_constructiveness,
      tone: feedback.score_tone,
    },
    feedback.score_originality !== 0
  );
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { authenticated } = usePrivy();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isOwner, setIsOwner] = React.useState(false);
  const [checkingOwnership, setCheckingOwnership] = React.useState(true);
  const [selectedGroupedFeedback, setSelectedGroupedFeedback] = React.useState<GroupedUserFeedback | null>(null);
  const [selectedFeedbackIndex, setSelectedFeedbackIndex] = React.useState(0);
  const [xpSortDirection, setXpSortDirection] = React.useState<"asc" | "desc">("desc");
  const [feedbackSortDirection, setFeedbackSortDirection] = React.useState<"asc" | "desc" | null>(null);
  const [showEditForm, setShowEditForm] = React.useState(false);

  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useQuery<ProjectDetails>({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/project/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch project");
      }
      return res.json();
    },
  });

  // Extract project fields for editing (must be before early returns)
  const projectFields = React.useMemo(() => {
    if (project?.summary) {
      return extractProjectFields(project.summary);
    }
    return { intro: '', features: '', whatToTest: '', productLink: '' };
  }, [project?.summary]);

  // Check if current user is project owner
  React.useEffect(() => {
    if (user && project && Number(user.id) === Number(project.user_id)) {
      setIsOwner(true);
    }
    setCheckingOwnership(false);
  }, [user, project]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background pb-20">
        <div className="mx-auto max-w-[90%] px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6 animate-pulse">
            <div className="h-12 bg-card rounded w-3/4"></div>
            <div className="h-6 bg-card rounded w-1/2"></div>
            <div className="h-32 bg-card rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !project) {
    return (
      <main className="min-h-screen bg-background pb-20">
        <div className="mx-auto max-w-[90%] px-4 py-8 sm:px-6 lg:px-8">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Project not found</CardTitle>
              <CardDescription>
                {error?.message ||
                  "The project you're looking for doesn't exist."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  const authorName = getUserDisplayName(project.users);

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-[90%] px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <Card>
          <CardHeader>
            <div className="space-y-4">
              {/* Title and Edit Button */}
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-3xl md:text-4xl">
                  {project.title}
                </CardTitle>
                {!checkingOwnership && isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditForm(true)}
                    className="shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {authorName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{authorName}</p>
                  {project.users?.username && (
                    <p className="text-xs text-muted-foreground">
                      @{project.users.username}
                    </p>
                  )}
                </div>
              </div>
              {project.summary && (
                <div className="text-base leading-relaxed pt-2">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-bold mb-3 mt-6" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-muted-foreground mb-4" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc ml-6 mb-4 text-muted-foreground" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal ml-6 mb-4 text-muted-foreground" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="my-1" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a className="text-primary underline hover:text-primary/80" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic" {...props} />
                      ),
                    }}
                  >
                    {project.summary}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </CardHeader>
          {/* Project Attachments */}
          {project.project_attachments && project.project_attachments.length > 0 && (
            <CardContent>
              <ProjectAttachmentsCarousel
                attachments={project.project_attachments}
                className="max-w-2xl mx-auto"
                imageClassName="object-contain"
              />
            </CardContent>
          )}
        </Card>

        {/* Feedback Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                User Feedback
              </h2>
            </div>
            {/* Generate Summary Button (Owner Only) */}
            {!checkingOwnership && isOwner && (
              <GenerateSummaryButton
                projectId={project.id}
                currentSummary={project.feedback_summary}
                onSummaryGenerated={() => {
                  queryClient.invalidateQueries({ queryKey: ["project", id] });
                }}
              />
            )}
          </div>

          {/* Feedback Summary */}
          {project.feedback_summary && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Feedback Summary
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([project.feedback_summary || ""], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${project.title.replace(/[^a-z0-9]/gi, "_")}_feedback_summary.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-base leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-xl font-bold mb-3 mt-6" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-muted-foreground mb-4" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc ml-6 mb-4 text-muted-foreground" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal ml-6 mb-4 text-muted-foreground" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="my-1" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a className="text-primary underline hover:text-primary/80" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic" {...props} />
                      ),
                    }}
                  >
                    {project.feedback_summary}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Feedback List */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">User</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => {
                      setFeedbackSortDirection(prev => prev === "desc" ? "asc" : "desc");
                      setXpSortDirection("desc"); // Reset XP sort when sorting by feedback
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Feedback
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-[120px] cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => {
                      setXpSortDirection(prev => prev === "desc" ? "asc" : "desc");
                      setFeedbackSortDirection(null); // Reset feedback sort when sorting by XP
                    }}
                  >
                    <div className="flex items-center gap-1">
                      XP
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Filter out bot messages
                  const filteredFeedback = project.feedback.filter((feedback) => {
                    const username = feedback.users?.username?.toLowerCase() || "";
                    return !username.endsWith("_bot") && !username.includes("_bot_");
                  });

                  // Group feedbacks by user
                  const groupedByUser = filteredFeedback.reduce<Record<string, GroupedUserFeedback>>(
                    (acc, feedback) => {
                      const key = feedback.users?.username || `user-${feedback.id}`;
                      if (!acc[key]) {
                        acc[key] = {
                          userId: null,
                          user: feedback.users,
                          feedbacks: [],
                          feedbackCount: 0,
                        };
                      }
                      acc[key].feedbacks.push(feedback);
                      acc[key].feedbackCount++;
                      return acc;
                    },
                    {}
                  );

                  let groupedFeedbacks = Object.values(groupedByUser);

                  // Sort by feedback count or XP
                  if (feedbackSortDirection) {
                    groupedFeedbacks = groupedFeedbacks.sort((a, b) => {
                      return feedbackSortDirection === "desc"
                        ? b.feedbackCount - a.feedbackCount
                        : a.feedbackCount - b.feedbackCount;
                    });
                  } else {
                    groupedFeedbacks = groupedFeedbacks.sort((a, b) => {
                      const xpA = a.user?.xp ?? 0;
                      const xpB = b.user?.xp ?? 0;
                      return xpSortDirection === "desc" ? xpB - xpA : xpA - xpB;
                    });
                  }

                  if (groupedFeedbacks.length === 0) {
                    return (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No feedback yet.
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return groupedFeedbacks.map((group) => {
                    const userName = getUserDisplayName(group.user);
                    const userInitial = userName.charAt(0).toUpperCase();
                    const latestFeedback = group.feedbacks[0];

                    return (
                      <TableRow
                        key={group.user?.username || `group-${latestFeedback.id}`}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedGroupedFeedback(group);
                          setSelectedFeedbackIndex(0);
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {group.user?.profile_picture_url ? (
                              <Image
                                src={group.user.profile_picture_url}
                                alt={userName}
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary-foreground">
                                  {userInitial}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col">
                              <div className="font-medium text-foreground">
                                {userName}
                              </div>
                              {group.user?.username && (
                                <a
                                  href={`https://t.me/${group.user.username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary/70 hover:text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  @{group.user.username}
                                </a>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {group.feedbackCount} feedback{group.feedbackCount !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              {latestFeedback.content && (
                                <p className="line-clamp-2 text-sm">
                                  &quot;{latestFeedback.content.length > 100
                                    ? `${latestFeedback.content.substring(0, 100)}...`
                                    : latestFeedback.content}&quot;
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {group.user?.xp ?? 0} XP
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* Feedback Detail Modal with Sidebar */}
        <Dialog
          open={!!selectedGroupedFeedback}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedGroupedFeedback(null);
              setSelectedFeedbackIndex(0);
            }
          }}
        >
          <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <div className="flex h-full max-h-[90vh]">
              {/* Sidebar */}
              {selectedGroupedFeedback && selectedGroupedFeedback.feedbacks.length > 1 && (
                <div className="w-64 border-r bg-muted/30 overflow-y-auto flex-shrink-0">
                  <div className="p-4 border-b">
                    <h3 className="font-medium text-sm">
                      {selectedGroupedFeedback.feedbackCount} Feedback{selectedGroupedFeedback.feedbackCount !== 1 ? "s" : ""}
                    </h3>
                  </div>
                  <div className="p-2">
                    {selectedGroupedFeedback.feedbacks.map((feedback, index) => {
                      const feedbackXP = getFeedbackXP(feedback);
                      return (
                        <button
                          key={feedback.id}
                          onClick={() => setSelectedFeedbackIndex(index)}
                          className={`w-full text-left p-3 rounded-md mb-1 transition-colors ${selectedFeedbackIndex === index
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted"
                            }`}
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </div>
                          <p className="text-sm line-clamp-2">
                            {feedback.content?.substring(0, 60) || "No text content"}
                            {feedback.content && feedback.content.length > 60 ? "..." : ""}
                          </p>
                          {feedbackXP > 0 && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              +{feedbackXP} XP
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle>Feedback Details</DialogTitle>
                  <DialogDescription>
                    {selectedGroupedFeedback && selectedGroupedFeedback.feedbacks.length > 1
                      ? `Viewing feedback ${selectedFeedbackIndex + 1} of ${selectedGroupedFeedback.feedbackCount}`
                      : "Full feedback content and details"
                    }
                  </DialogDescription>
                </DialogHeader>

                {selectedGroupedFeedback && (() => {
                  const currentFeedback = selectedGroupedFeedback.feedbacks[selectedFeedbackIndex];
                  const feedbackXP = getFeedbackXP(currentFeedback);

                  return (
                    <div className="p-6 pt-0 space-y-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3 pb-4 border-b">
                        {selectedGroupedFeedback.user?.profile_picture_url ? (
                          <Image
                            src={selectedGroupedFeedback.user.profile_picture_url}
                            alt={getUserDisplayName(selectedGroupedFeedback.user)}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary-foreground">
                              {getUserDisplayName(selectedGroupedFeedback.user).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {getUserDisplayName(selectedGroupedFeedback.user)}
                          </div>
                          {selectedGroupedFeedback.user?.username && (
                            <a
                              href={`https://t.me/${selectedGroupedFeedback.user.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary/70 hover:text-primary hover:underline"
                            >
                              @{selectedGroupedFeedback.user.username}
                            </a>
                          )}
                        </div>
                        {selectedGroupedFeedback.user?.tier && (
                          <Badge
                            variant="secondary"
                            className={`${getTierColor(selectedGroupedFeedback.user.tier as UserTier).bg
                              } ${getTierColor(selectedGroupedFeedback.user.tier as UserTier).text
                              }`}
                          >
                            {getTierColor(selectedGroupedFeedback.user.tier as UserTier).label}
                          </Badge>
                        )}
                      </div>

                      {/* Feedback Content */}
                      <div className="space-y-3">
                        {/* Reply Context - show what this feedback is replying to */}
                        {currentFeedback.reply_to_content && (
                          <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-primary/30">
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">↩ Replying to:</h4>
                            <p className="text-sm text-muted-foreground/80 italic whitespace-pre-wrap line-clamp-3">
                              &quot;{currentFeedback.reply_to_content}&quot;
                            </p>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-medium mb-2">Feedback</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {currentFeedback.content || "No text content"}
                          </p>
                        </div>

                        {/* Media */}
                        {currentFeedback.media_url && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Media</h4>
                            {currentFeedback.media_type?.startsWith("image") ? (
                              <div className="relative w-full h-64">
                                <Image
                                  src={currentFeedback.media_url}
                                  alt="Feedback media"
                                  fill
                                  className="object-contain rounded border border-border"
                                />
                              </div>
                            ) : currentFeedback.media_type?.startsWith("video") ? (
                              <video
                                src={currentFeedback.media_url}
                                controls
                                className="w-full max-w-md rounded border border-border"
                              />
                            ) : null}
                          </div>
                        )}

                        {/* Scores */}
                        {(currentFeedback.score_relevance !== null ||
                          currentFeedback.score_depth !== null) && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Scores</h4>
                              <div className="flex flex-wrap gap-2">
                                {currentFeedback.score_relevance !== null && (
                                  <Badge
                                    variant="secondary"
                                    className={`${getScoreColor(currentFeedback.score_relevance).bg
                                      } ${getScoreColor(currentFeedback.score_relevance).text
                                      }`}
                                  >
                                    Relevance: {currentFeedback.score_relevance}/10
                                  </Badge>
                                )}
                                {currentFeedback.score_depth !== null && (
                                  <Badge
                                    variant="secondary"
                                    className={`${getScoreColor(currentFeedback.score_depth).bg
                                      } ${getScoreColor(currentFeedback.score_depth).text
                                      }`}
                                  >
                                    Depth: {currentFeedback.score_depth}/10
                                  </Badge>
                                )}
                                {currentFeedback.score_evidence !== null && (
                                  <Badge
                                    variant="secondary"
                                    className={`${getScoreColor(currentFeedback.score_evidence).bg
                                      } ${getScoreColor(currentFeedback.score_evidence).text
                                      }`}
                                  >
                                    Evidence: {currentFeedback.score_evidence}/10
                                  </Badge>
                                )}
                                {currentFeedback.score_constructiveness !== null && (
                                  <Badge
                                    variant="secondary"
                                    className={`${getScoreColor(currentFeedback.score_constructiveness).bg
                                      } ${getScoreColor(currentFeedback.score_constructiveness).text
                                      }`}
                                  >
                                    Constructiveness: {currentFeedback.score_constructiveness}/10
                                  </Badge>
                                )}
                                {currentFeedback.score_tone !== null && (
                                  <Badge
                                    variant="secondary"
                                    className={`${getScoreColor(currentFeedback.score_tone).bg
                                      } ${getScoreColor(currentFeedback.score_tone).text
                                      }`}
                                  >
                                    Tone: {currentFeedback.score_tone}/10
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Per-Feedback XP */}
                        {feedbackXP > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Feedback XP</h4>
                            <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                              +{feedbackXP} XP
                            </Badge>
                          </div>
                        )}

                        {/* Date */}
                        <div>
                          <h4 className="text-sm font-medium mb-1">Date</h4>
                          <span className="text-sm text-muted-foreground">
                            {new Date(currentFeedback.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Project Form */}
        {showEditForm && (
          <CreateProjectForm
            onClose={() => setShowEditForm(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["project", id] });
            }}
            projectId={project.id}
            initialData={{
              title: project.title,
              ...projectFields,
            }}
            isEditing={true}
          />
        )}

      </div>
    </main >
  );
}
