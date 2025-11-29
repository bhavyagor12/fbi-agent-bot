"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";

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
      <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  // Not authenticated or not whitelisted
  if (!authenticated || !isWhitelisted) {
    return (
      <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-md">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Access Denied
            </h1>
            <p className="text-muted-foreground mb-6">
              {!authenticated
                ? "Please connect your wallet to access this page."
                : "Your wallet address is not authorized to review projects."}
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-[80%] px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Review Pending Projects
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                Accept or reject projects awaiting approval
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-card"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[80%] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 text-sm text-muted-foreground">
          {loadingProjects ? (
            "Loading projects..."
          ) : isError ? (
            "Error loading projects"
          ) : (
            <>
              {projects.length} project{projects.length !== 1 ? "s" : ""}{" "}
              pending review
            </>
          )}
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
          <div className="space-y-6">
            {projects.map((project: Project) => (
              <div
                key={project.id}
                className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 transition-all hover:border-border"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {project.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Submitted by{" "}
                          {project.users.first_name || project.users.username}{" "}
                          {project.users.last_name} •{" "}
                          {new Date(project.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-foreground/80 line-clamp-3">
                          {project.summary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 min-w-[140px]">
                    <button
                      onClick={() => acceptMutation.mutate(project.id)}
                      disabled={
                        acceptMutation.isPending || rejectMutation.isPending
                      }
                      className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acceptMutation.isPending &&
                      acceptMutation.variables === project.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(project.id)}
                      disabled={
                        acceptMutation.isPending || rejectMutation.isPending
                      }
                      className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rejectMutation.isPending &&
                      rejectMutation.variables === project.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/50 p-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No pending projects
            </h3>
            <p className="text-muted-foreground">
              All projects have been reviewed
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
