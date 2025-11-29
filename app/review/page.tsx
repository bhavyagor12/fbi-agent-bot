"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProjectAttachmentsCarousel from "@/components/project-attachments-carousel";

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

  // Get wallet address
  const walletAddress = user?.wallet?.address;

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
    data: projects = [],
    isLoading: loadingProjects,
    isError,
  } = useQuery({
    queryKey: ["inReviewProjects"],
    queryFn: async () => {
      const res = await fetch("/api/getAllInReviewProjects");
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }
      return res.json();
    },
    enabled: isWhitelisted === true,
  });

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
            Review Pending Projects
          </h1>
          <p className="mt-2 text-muted-foreground">
            Accept or reject projects awaiting approval
          </p>
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
                pending review
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

                      {/* Project Attachments */}
                      {project.project_attachments &&
                        project.project_attachments.length > 0 && (
                          <div className="max-w-md">
                            <ProjectAttachmentsCarousel
                              attachments={project.project_attachments}
                            />
                          </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 min-w-[140px]">
                      <Button
                        onClick={() => acceptMutation.mutate(project.id)}
                        disabled={
                          acceptMutation.isPending || rejectMutation.isPending
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
                          acceptMutation.isPending || rejectMutation.isPending
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
                No pending projects
              </CardTitle>
              <CardDescription>All projects have been reviewed</CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
