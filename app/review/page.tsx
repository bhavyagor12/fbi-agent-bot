"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Loader2, ShieldAlert, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [activeTab, setActiveTab] = useState<"review" | "archived">("review");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
              <Card 
                key={project.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedProject(project)}
              >
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
                    <div 
                      className="flex flex-col gap-3 min-w-[140px]"
                      onClick={(e) => e.stopPropagation()}
                    >
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

        {/* Detailed Project View Dialog */}
        <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedProject && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedProject.title}</DialogTitle>
                  <DialogDescription>
                    Submitted by {selectedProject.users.first_name || selectedProject.users.username}{" "}
                    {selectedProject.users.last_name} • {new Date(selectedProject.created_at).toLocaleDateString()}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Project Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Project Summary</h3>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {selectedProject.summary}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Attachments */}
                  {selectedProject.project_attachments && selectedProject.project_attachments.length > 0 && (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Attachments</h3>
                        <ProjectAttachmentsCarousel attachments={selectedProject.project_attachments} />
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    {activeTab === "review" ? (
                      <>
                        <Button
                          onClick={() => {
                            acceptMutation.mutate(selectedProject.id);
                            setSelectedProject(null);
                          }}
                          disabled={
                            acceptMutation.isPending ||
                            rejectMutation.isPending
                          }
                          className="bg-green-600 hover:bg-green-700 gap-2 flex-1"
                        >
                          {acceptMutation.isPending &&
                          acceptMutation.variables === selectedProject.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Accept
                        </Button>
                        <Button
                          onClick={() => {
                            rejectMutation.mutate(selectedProject.id);
                            setSelectedProject(null);
                          }}
                          disabled={
                            acceptMutation.isPending ||
                            rejectMutation.isPending
                          }
                          variant="destructive"
                          className="gap-2 flex-1"
                        >
                          {rejectMutation.isPending &&
                          rejectMutation.variables === selectedProject.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => {
                          restoreMutation.mutate(selectedProject.id);
                          setSelectedProject(null);
                        }}
                        disabled={restoreMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 gap-2 flex-1"
                      >
                        {restoreMutation.isPending &&
                        restoreMutation.variables === selectedProject.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Restore to Review
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setSelectedProject(null)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
