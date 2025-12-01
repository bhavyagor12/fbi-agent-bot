"use client";

import { MessageSquare, Award, X } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getScoreColor, getTierColor, UserTier } from "@/lib/colors";
import { usePrivy } from "@privy-io/react-auth";
import { getUserByWallet } from "@/lib/supabase";
import GenerateSummaryButton from "@/components/generate-summary-button";
import ProjectAttachmentsCarousel from "@/components/project-attachments-carousel";

// Extended Project Interface
interface UserInfo {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  xp?: number | null;
  tier?: string | null;
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

export default function ProjectDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, authenticated } = usePrivy();
  const queryClient = useQueryClient();
  const [isOwner, setIsOwner] = React.useState(false);
  const [checkingOwnership, setCheckingOwnership] = React.useState(true);
  const [selectedFeedback, setSelectedFeedback] = React.useState<Feedback | null>(null);

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

  // Check if current user is project owner
  React.useEffect(() => {
    async function checkOwnership() {
      if (!authenticated || !user?.wallet?.address || !project) {
        setCheckingOwnership(false);
        return;
      }

      try {
        const { data: userData } = await getUserByWallet(user.wallet.address.toLowerCase());
        if (userData && project.user_id && userData.id === project.user_id) {
          setIsOwner(true);
        }
      } catch (error) {
        console.error("Error checking ownership:", error);
      } finally {
        setCheckingOwnership(false);
      }
    }

    checkOwnership();
  }, [authenticated, user, project]);

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
              <CardTitle className="text-3xl md:text-4xl">
                {project.title}
              </CardTitle>
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
                <CardDescription className="text-base leading-relaxed pt-2">
                  {project.summary}
                </CardDescription>
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Feedback Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {project.feedback_summary}
                </p>
              </CardContent>
            </Card>
          )}
          {/* Feedback List */}
          <Card>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">User</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead className="w-[150px]">XP & Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.feedback.length > 0 ? (
                    project.feedback.map((feedback) => {
                      const userName = getUserDisplayName(feedback.users);
                      const userInitial = userName.charAt(0).toUpperCase();
                      return (
                        <TableRow 
                          key={feedback.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedFeedback(feedback)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary-foreground">
                                  {userInitial}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <div className="font-medium text-foreground">
                                  {userName}
                                </div>
                                {feedback.users?.username && (
                                  <div className="text-xs text-muted-foreground/70">
                                    @{feedback.users.username}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="space-y-2">
                              {feedback.content && (
                                <p className="line-clamp-3">
                                  &quot;{feedback.content.length > 150 
                                    ? `${feedback.content.substring(0, 150)}...` 
                                    : feedback.content}&quot;
                                </p>
                              )}
                              {feedback.media_url && (
                                <div className="mt-2">
                                  {feedback.media_type?.startsWith("image") ? (
                                    <div className="relative w-full max-w-xs h-48">
                                      <Image
                                        src={feedback.media_url}
                                        alt="Feedback media"
                                        fill
                                        className="object-contain rounded border border-border"
                                      />
                                    </div>
                                  ) : feedback.media_type?.startsWith(
                                      "video"
                                    ) ? (
                                    <video
                                      src={feedback.media_url}
                                      controls
                                      className="max-w-xs rounded border border-border"
                                    />
                                  ) : null}
                                </div>
                              )}
                              {(feedback.score_relevance !== null ||
                                feedback.score_depth !== null) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {feedback.score_relevance !== null && (
                                    <Badge
                                      variant="secondary"
                                      className={`${
                                        getScoreColor(feedback.score_relevance)
                                          .bg
                                      } ${
                                        getScoreColor(feedback.score_relevance)
                                          .text
                                      }`}
                                    >
                                      Relevance: {feedback.score_relevance}/10
                                    </Badge>
                                  )}
                                  {feedback.score_depth !== null && (
                                    <Badge
                                      variant="secondary"
                                      className={`${
                                        getScoreColor(feedback.score_depth).bg
                                      } ${
                                        getScoreColor(feedback.score_depth).text
                                      }`}
                                    >
                                      Depth: {feedback.score_depth}/10
                                    </Badge>
                                  )}
                                  {feedback.score_evidence !== null && (
                                    <Badge
                                      variant="secondary"
                                      className={`${
                                        getScoreColor(feedback.score_evidence)
                                          .bg
                                      } ${
                                        getScoreColor(feedback.score_evidence)
                                          .text
                                      }`}
                                    >
                                      Evidence: {feedback.score_evidence}/10
                                    </Badge>
                                  )}
                                  {feedback.score_constructiveness !== null && (
                                    <Badge
                                      variant="secondary"
                                      className={`${
                                        getScoreColor(
                                          feedback.score_constructiveness
                                        ).bg
                                      } ${
                                        getScoreColor(
                                          feedback.score_constructiveness
                                        ).text
                                      }`}
                                    >
                                      Constructiveness:{" "}
                                      {feedback.score_constructiveness}/10
                                    </Badge>
                                  )}
                                  {feedback.score_tone !== null && (
                                    <Badge
                                      variant="secondary"
                                      className={`${
                                        getScoreColor(feedback.score_tone).bg
                                      } ${
                                        getScoreColor(feedback.score_tone).text
                                      }`}
                                    >
                                      Tone: {feedback.score_tone}/10
                                    </Badge>
                                  )}
                                  {feedback.score_originality !== null && (
                                    <Badge
                                      variant="secondary"
                                      className={`${
                                        getScoreColor(
                                          feedback.score_originality
                                        ).bg
                                      } ${
                                        getScoreColor(
                                          feedback.score_originality
                                        ).text
                                      }`}
                                    >
                                      Originality: {feedback.score_originality}
                                      /10
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              {feedback.users?.xp !== undefined &&
                                feedback.users.xp !== null && (
                                  <span className="text-sm font-medium">
                                    {feedback.users.xp} XP
                                  </span>
                                )}
                              {feedback.users?.tier && (
                                <Badge
                                  variant="secondary"
                                  className={`w-fit ${
                                    getTierColor(
                                      feedback.users.tier as UserTier
                                    ).bg
                                  } ${
                                    getTierColor(
                                      feedback.users.tier as UserTier
                                    ).text
                                  }`}
                                >
                                  {
                                    getTierColor(
                                      feedback.users.tier as UserTier
                                    ).label
                                  }
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {project.feedback.length === 0
                          ? "No feedback yet."
                          : "No results found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
        </section>

        {/* Feedback Detail Modal */}
        <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Feedback Details</DialogTitle>
              <DialogDescription>
                Full feedback content and details
              </DialogDescription>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">
                      {getUserDisplayName(selectedFeedback.users).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {getUserDisplayName(selectedFeedback.users)}
                    </div>
                    {selectedFeedback.users?.username && (
                      <div className="text-sm text-muted-foreground">
                        @{selectedFeedback.users.username}
                      </div>
                    )}
                  </div>
                  {selectedFeedback.users?.tier && (
                    <Badge
                      variant="secondary"
                      className={`${
                        getTierColor(selectedFeedback.users.tier as UserTier).bg
                      } ${
                        getTierColor(selectedFeedback.users.tier as UserTier).text
                      }`}
                    >
                      {getTierColor(selectedFeedback.users.tier as UserTier).label}
                    </Badge>
                  )}
                </div>

                {/* Feedback Content */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Feedback</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedFeedback.content || "No text content"}
                    </p>
                  </div>

                  {/* Media */}
                  {selectedFeedback.media_url && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Media</h4>
                      {selectedFeedback.media_type?.startsWith("image") ? (
                        <div className="relative w-full h-64">
                          <Image
                            src={selectedFeedback.media_url}
                            alt="Feedback media"
                            fill
                            className="object-contain rounded border border-border"
                          />
                        </div>
                      ) : selectedFeedback.media_type?.startsWith("video") ? (
                        <video
                          src={selectedFeedback.media_url}
                          controls
                          className="w-full max-w-md rounded border border-border"
                        />
                      ) : null}
                    </div>
                  )}

                  {/* Scores */}
                  {(selectedFeedback.score_relevance !== null ||
                    selectedFeedback.score_depth !== null) && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Scores</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeedback.score_relevance !== null && (
                          <Badge
                            variant="secondary"
                            className={`${
                              getScoreColor(selectedFeedback.score_relevance).bg
                            } ${
                              getScoreColor(selectedFeedback.score_relevance).text
                            }`}
                          >
                            Relevance: {selectedFeedback.score_relevance}/10
                          </Badge>
                        )}
                        {selectedFeedback.score_depth !== null && (
                          <Badge
                            variant="secondary"
                            className={`${
                              getScoreColor(selectedFeedback.score_depth).bg
                            } ${
                              getScoreColor(selectedFeedback.score_depth).text
                            }`}
                          >
                            Depth: {selectedFeedback.score_depth}/10
                          </Badge>
                        )}
                        {selectedFeedback.score_evidence !== null && (
                          <Badge
                            variant="secondary"
                            className={`${
                              getScoreColor(selectedFeedback.score_evidence).bg
                            } ${
                              getScoreColor(selectedFeedback.score_evidence).text
                            }`}
                          >
                            Evidence: {selectedFeedback.score_evidence}/10
                          </Badge>
                        )}
                        {selectedFeedback.score_constructiveness !== null && (
                          <Badge
                            variant="secondary"
                            className={`${
                              getScoreColor(selectedFeedback.score_constructiveness).bg
                            } ${
                              getScoreColor(selectedFeedback.score_constructiveness).text
                            }`}
                          >
                            Constructiveness: {selectedFeedback.score_constructiveness}/10
                          </Badge>
                        )}
                        {selectedFeedback.score_tone !== null && (
                          <Badge
                            variant="secondary"
                            className={`${
                              getScoreColor(selectedFeedback.score_tone).bg
                            } ${
                              getScoreColor(selectedFeedback.score_tone).text
                            }`}
                          >
                            Tone: {selectedFeedback.score_tone}/10
                          </Badge>
                        )}
                        {selectedFeedback.score_originality !== null && (
                          <Badge
                            variant="secondary"
                            className={`${
                              getScoreColor(selectedFeedback.score_originality).bg
                            } ${
                              getScoreColor(selectedFeedback.score_originality).text
                            }`}
                          >
                            Originality: {selectedFeedback.score_originality}/10
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* XP */}
                  {selectedFeedback.users?.xp !== undefined &&
                    selectedFeedback.users.xp !== null && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">XP</h4>
                        <span className="text-sm text-muted-foreground">
                          {selectedFeedback.users.xp} XP
                        </span>
                      </div>
                    )}

                  {/* Date */}
                  <div>
                    <h4 className="text-sm font-medium mb-1">Date</h4>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedFeedback.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
