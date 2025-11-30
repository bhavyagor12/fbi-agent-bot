"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Loader2, ShieldAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectAttachment {
  id: number;
  url: string;
  media_type: string;
}

interface Project {
  id: number;
  title: string;
  summary: string;
  user_id?: number;
  feedback_summary?: string | null;
  created_at: string;
  users: {
    first_name: string;
    last_name: string;
    username: string;
  };
  project_attachments?: ProjectAttachment[];
}
export default function ReviewPage() {
  const { authenticated, user, ready } = usePrivy();
  const queryClient = useQueryClient();
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [checkingWhitelist, setCheckingWhitelist] = useState(true);
  const [activeTab, setActiveTab] = useState<"review" | "archived">("review");

  // Get wallet address (normalized to lowercase)
  const walletAddress = user?.wallet?.address?.toLowerCase();

  // Check if wallet is whitelisted
  useEffect(() => {
    async function checkWhitelist() {
      if (!authenticated || !walletAddress) {
        setIsWhitelisted(false);
        setCheckingWhitelist(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/checkWhitelist?wallet=${encodeURIComponent(walletAddress)}`
        );
        const data = await res.json();
        setIsWhitelisted(data.isWhitelisted);
      } catch (error) {
        console.error("Error checking whitelist:", error);
        setIsWhitelisted(false);
      } finally {
        setCheckingWhitelist(false);
      }
    }

    if (ready) {
      checkWhitelist();
    }
  }, [authenticated, walletAddress, ready]);

  // Fetch in-review projects
  const {
    data: inReviewProjects = [],
    isLoading: loadingInReview,
    isError: inReviewError,
  } = useQuery({
    queryKey: ["inReviewProjects"],
    queryFn: async () => {
      const res = await fetch("/api/getAllInReviewProjects");
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }
      return res.json();
    },
    enabled: isWhitelisted === true && activeTab === "review",
  });

  // Fetch archived projects
  const {
    data: archivedProjects = [],
    isLoading: loadingArchived,
    isError: archivedError,
  } = useQuery({
    queryKey: ["archivedProjects"],
    queryFn: async () => {
      const res = await fetch("/api/getAllArchivedProjects");
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }
      return res.json();
    },
    enabled: isWhitelisted === true && activeTab === "archived",
  });

  // Get current projects based on active tab
  const projects = activeTab === "review" ? inReviewProjects : archivedProjects;
  const loadingProjects = activeTab === "review" ? loadingInReview : loadingArchived;
  const isError = activeTab === "review" ? inReviewError : archivedError;

  // Accept project mutation
  const acceptMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await fetch(`/api/project/${projectId}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to accept project");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inReviewProjects"] });
    },
  });

  // Reject project mutation
  const rejectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await fetch(`/api/project/${projectId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to reject project");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inReviewProjects"] });
      queryClient.invalidateQueries({ queryKey: ["archivedProjects"] });
    },
  });

  // Restore project mutation
  const restoreMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await fetch(`/api/project/${projectId}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to restore project");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archivedProjects"] });
      queryClient.invalidateQueries({ queryKey: ["inReviewProjects"] });
    },
  });

  // Loading state
  if (!ready || checkingWhitelist) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  // Not authenticated or not whitelisted
  if (!authenticated || !isWhitelisted) {
    return (
      <main className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <Card className="max-w-md text-center">
            <CardHeader>
              <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl">Access Denied</CardTitle>
              <CardDescription>
                {!authenticated
                  ? "Please connect your wallet to access this page."
                  : "Your wallet address is not authorized to review projects."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[90%] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Project Review
          </h1>
          <p className="mt-2 text-muted-foreground">
            {activeTab === "review"
              ? "Accept or reject projects awaiting approval"
              : "Restore archived projects back to review"}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          <Button
            variant={activeTab === "review" ? "default" : "ghost"}
            onClick={() => setActiveTab("review")}
            className="rounded-b-none"
          >
            Under Review
            {!loadingInReview && inReviewProjects.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {inReviewProjects.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "archived" ? "default" : "ghost"}
            onClick={() => setActiveTab("archived")}
            className="rounded-b-none"
          >
            Archived
            {!loadingArchived && archivedProjects.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {archivedProjects.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <Badge variant="secondary">
            {loadingProjects ? (
              "Loading..."
            ) : isError ? (
              "Error loading projects"
            ) : (
              <>
                {projects.length} project{projects.length !== 1 ? "s" : ""}{" "}
                {activeTab === "review" ? "pending review" : "archived"}
              </>
            )}
          </Badge>
        </div>

        {/* Projects List */}
        {loadingProjects ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-xl border bg-card/50 animate-pulse"
              />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project: Project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div>
                        <CardTitle className="text-xl mb-2">
                          {project.title}
                        </CardTitle>
                        <CardDescription className="mb-3">
                          Submitted by{" "}
                          {project.users.first_name || project.users.username}{" "}
                          {project.users.last_name} •{" "}
                          {new Date(project.created_at).toLocaleDateString()}
                        </CardDescription>
                        <p className="text-sm line-clamp-3">
                          {project.summary}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 min-w-[140px]">
                      {activeTab === "review" ? (
                        <>
                          <Button
                            onClick={() => acceptMutation.mutate(project.id)}
                            disabled={
                              acceptMutation.isPending ||
                              rejectMutation.isPending
                            }
                            className="bg-green-600 hover:bg-green-700 gap-2"
                          >
                            {acceptMutation.isPending &&
                            acceptMutation.variables === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Accept
                          </Button>
                          <Button
                            onClick={() => rejectMutation.mutate(project.id)}
                            disabled={
                              acceptMutation.isPending ||
                              rejectMutation.isPending
                            }
                            variant="destructive"
                            className="gap-2"
                          >
                            {rejectMutation.isPending &&
                            rejectMutation.variables === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => restoreMutation.mutate(project.id)}
                          disabled={restoreMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 gap-2"
                        >
                          {restoreMutation.isPending &&
                          restoreMutation.variables === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Restore to Review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <CardTitle className="text-lg mb-1">
                {activeTab === "review"
                  ? "No pending projects"
                  : "No archived projects"}
              </CardTitle>
              <CardDescription>
                {activeTab === "review"
                  ? "All projects have been reviewed"
                  : "No projects have been archived"}
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
