"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/components/user-provider";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Loader2, ShieldAlert, RotateCcw, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface UserToReview {
  id: number;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  wallet_address: string | null;
  profile_picture_url: string | null;
  created_at: string;
  approved: boolean;
}

export default function ReviewPage() {
  const { authenticated, ready } = usePrivy();
  const { isWhitelisted, isLoading: checkingWhitelist } = useUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");

  // Fetch unapproved users
  const {
    data: unapprovedUsers = [],
    isLoading: loadingUnapproved,
    isError: unapprovedError,
  } = useQuery({
    queryKey: ["unapprovedUsers"],
    queryFn: async () => {
      const res = await fetch("/api/getUnapprovedUsers");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return res.json();
    },
    enabled: isWhitelisted === true && activeTab === "pending",
  });

  // Fetch approved users
  const {
    data: approvedUsers = [],
    isLoading: loadingApproved,
    isError: approvedError,
  } = useQuery({
    queryKey: ["approvedUsers"],
    queryFn: async () => {
      const res = await fetch("/api/getApprovedUsers");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return res.json();
    },
    enabled: isWhitelisted === true && activeTab === "approved",
  });

  // Get current users based on active tab
  const users = activeTab === "pending" ? unapprovedUsers : approvedUsers;
  const loadingUsers = activeTab === "pending" ? loadingUnapproved : loadingApproved;
  const isError = activeTab === "pending" ? unapprovedError : approvedError;

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/user/${userId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to approve user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unapprovedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["approvedUsers"] });
    },
  });

  // Revoke approval mutation
  const revokeMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/user/${userId}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to revoke approval");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unapprovedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["approvedUsers"] });
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
                  : "Your wallet address is not authorized to manage user approvals."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  const getUserDisplayName = (user: UserToReview) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.username || user.email.split("@")[0];
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[90%] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            User Approval
          </h1>
          <p className="mt-2 text-muted-foreground">
            {activeTab === "pending"
              ? "Approve users to allow them to create projects"
              : "Manage approved users"}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          <Button
            variant={activeTab === "pending" ? "default" : "ghost"}
            onClick={() => setActiveTab("pending")}
            className="rounded-b-none"
          >
            Pending Approval
            {!loadingUnapproved && unapprovedUsers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unapprovedUsers.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "approved" ? "default" : "ghost"}
            onClick={() => setActiveTab("approved")}
            className="rounded-b-none"
          >
            Approved Users
            {!loadingApproved && approvedUsers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {approvedUsers.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <Badge variant="secondary">
            {loadingUsers ? (
              "Loading..."
            ) : isError ? (
              "Error loading users"
            ) : (
              <>
                {users.length} user{users.length !== 1 ? "s" : ""}{" "}
                {activeTab === "pending" ? "pending approval" : "approved"}
              </>
            )}
          </Badge>
        </div>

        {/* Users List */}
        {loadingUsers ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl border bg-card/50 animate-pulse"
              />
            ))}
          </div>
        ) : users.length > 0 ? (
          <div className="space-y-4">
            {users.map((userItem: UserToReview) => (
              <Card key={userItem.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {userItem.profile_picture_url ? (
                        <Image
                          src={userItem.profile_picture_url}
                          alt={getUserDisplayName(userItem)}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary-foreground" />
                        </div>
                      )}

                      <div>
                        <CardTitle className="text-lg">
                          {getUserDisplayName(userItem)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4" />
                          {userItem.email}
                        </CardDescription>
                        {userItem.username && (
                          <a
                            href={`https://t.me/${userItem.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary/70 hover:text-primary hover:underline"
                          >
                            @{userItem.username}
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Registered: {new Date(userItem.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 min-w-[140px]">
                      {activeTab === "pending" ? (
                        <Button
                          onClick={() => approveMutation.mutate(userItem.id)}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 gap-2"
                        >
                          {approveMutation.isPending &&
                            approveMutation.variables === userItem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                      ) : (
                        <Button
                          onClick={() => revokeMutation.mutate(userItem.id)}
                          disabled={revokeMutation.isPending}
                          variant="destructive"
                          className="gap-2"
                        >
                          {revokeMutation.isPending &&
                            revokeMutation.variables === userItem.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Revoke Access
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
                {activeTab === "pending"
                  ? "No pending users"
                  : "No approved users"}
              </CardTitle>
              <CardDescription>
                {activeTab === "pending"
                  ? "All users have been reviewed"
                  : "No users have been approved yet"}
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
