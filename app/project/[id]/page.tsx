"use client";

import { ArrowLeft, MessageSquare, Award } from "lucide-react";
import Link from "next/link";
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
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getScoreColor, getTierColor, UserTier } from "@/lib/colors";

// Extended Project Interface
interface UserInfo {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  xp?: number | null;
  tier?: string | null;
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
  users: UserInfo;
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-20">
        <div className="mx-auto max-w-[80%] px-4 py-12 sm:px-6 lg:px-8">
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
      <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-20">
        <div className="mx-auto max-w-[80%] px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Project not found
            </h1>
            <p className="text-muted-foreground">
              {error?.message ||
                "The project you're looking for doesn't exist."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const authorName = getUserDisplayName(project.users);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20">
      {/* Navigation */}
      <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-[80%] px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[80%] px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              {project.title}
            </h1>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-sm font-bold text-primary-foreground">
                  {authorName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-foreground">
                  {authorName}
                </p>
                {project.users?.username && (
                  <p className="text-xs text-muted-foreground">
                    @{project.users.username}
                  </p>
                )}
              </div>
            </div>
          </div>

          {project.summary && (
            <div className="prose prose-invert max-w-none">
              <p className="text-xl text-muted-foreground leading-relaxed">
                {project.summary}
              </p>
            </div>
          )}
        </div>

        <hr className="border-border/50" />

        {/* Feedback Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              User Feedback
            </h2>
          </div>

          {/* Feedback Summary */}
          {project.feedback_summary && (
            <div className="bg-card/50 border border-border/50 rounded-xl p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Feedback Summary
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {project.feedback_summary}
              </p>
            </div>
          )}
          {/* Feedback List */}
          <div className="space-y-4">
            <div className="rounded-md border border-border/50 overflow-hidden">
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
                        <TableRow key={feedback.id}>
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
                                <p>&quot;{feedback.content}&quot;</p>
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
                                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                  {feedback.score_relevance !== null && (
                                    <span
                                      className={`px-2 py-1 rounded ${
                                        getScoreColor(feedback.score_relevance)
                                          .bg
                                      } ${
                                        getScoreColor(feedback.score_relevance)
                                          .text
                                      }`}
                                    >
                                      Relevance: {feedback.score_relevance}/10
                                    </span>
                                  )}
                                  {feedback.score_depth !== null && (
                                    <span
                                      className={`px-2 py-1 rounded ${
                                        getScoreColor(feedback.score_depth).bg
                                      } ${
                                        getScoreColor(feedback.score_depth).text
                                      }`}
                                    >
                                      Depth: {feedback.score_depth}/10
                                    </span>
                                  )}
                                  {feedback.score_evidence !== null && (
                                    <span
                                      className={`px-2 py-1 rounded ${
                                        getScoreColor(feedback.score_evidence)
                                          .bg
                                      } ${
                                        getScoreColor(feedback.score_evidence)
                                          .text
                                      }`}
                                    >
                                      Evidence: {feedback.score_evidence}/10
                                    </span>
                                  )}
                                  {feedback.score_constructiveness !== null && (
                                    <span
                                      className={`px-2 py-1 rounded ${
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
                                    </span>
                                  )}
                                  {feedback.score_tone !== null && (
                                    <span
                                      className={`px-2 py-1 rounded ${
                                        getScoreColor(feedback.score_tone).bg
                                      } ${
                                        getScoreColor(feedback.score_tone).text
                                      }`}
                                    >
                                      Tone: {feedback.score_tone}/10
                                    </span>
                                  )}
                                  {feedback.score_originality !== null && (
                                    <span
                                      className={`px-2 py-1 rounded ${
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
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex flex-col gap-1">
                              {feedback.users?.xp !== undefined &&
                                feedback.users.xp !== null && (
                                  <span className="text-sm font-medium text-foreground">
                                    {feedback.users.xp} XP
                                  </span>
                                )}
                              {feedback.users?.tier && (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded w-fit font-semibold ${
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
                                </span>
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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
