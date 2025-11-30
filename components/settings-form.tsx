"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Save, Loader2, Trophy, Star, MessageSquare, FolderOpen, Info, CheckCircle, Clock, XCircle } from "lucide-react";
import {
    getOrUpsertUserByWallet,
    updateUserProfile,
    getUserByWallet,
    getUserStats,
    getProjectsByUserId,
} from "@/lib/supabase";
import { getTierColor, UserTier } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function SettingsForm() {
    const { user, authenticated } = usePrivy();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profileComplete, setProfileComplete] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        first_name: "",
        last_name: "",
        wallet_address: "",
    });
    const [stats, setStats] = useState({
        xp: 0,
        tier: "bronze",
        projectCount: 0,
        feedbackCount: 0,
    });
    const [projectCounts, setProjectCounts] = useState({
        active: 0,
        inReview: 0,
        archived: 0,
    });
    const privyWalletAddress = user?.wallet?.address;

    // Fetch user profile on mount
    useEffect(() => {
        async function loadProfile() {
            if (!authenticated) return;

            setLoading(true);
            
            // Try to get user by Privy wallet address first
            let userData = null;
            if (privyWalletAddress) {
                const result = await getUserByWallet(privyWalletAddress.toLowerCase());
                userData = result.data;
            }

            // If no user found and we have a Privy wallet, create/get user
            if (!userData && privyWalletAddress) {
                const result = await getOrUpsertUserByWallet(privyWalletAddress.toLowerCase());
                userData = result.data;
            }

            if (userData) {
                setFormData({
                    username: userData.username || "",
                    first_name: userData.first_name || "",
                    last_name: userData.last_name || "",
                    wallet_address: userData.wallet_address || privyWalletAddress || "",
                });

                // Check if profile is complete
                if (userData.username && userData.first_name && userData.last_name && userData.wallet_address) {
                    setProfileComplete(true);
                }

                // Fetch stats
                const userStats = await getUserStats(userData.id);
                setStats({
                    xp: userData.xp || 0,
                    tier: userData.tier || "bronze",
                    projectCount: userStats.projectCount,
                    feedbackCount: userStats.feedbackCount,
                });

                // Fetch project counts by status
                const { data: projects } = await getProjectsByUserId(userData.id);
                if (projects) {
                    const counts = {
                        active: projects.filter((p: any) => p.status === "active").length,
                        inReview: projects.filter((p: any) => p.status === "in_review").length,
                        archived: projects.filter((p: any) => p.status === "archived").length,
                    };
                    setProjectCounts(counts);
                }
            } else {
                // No user found, initialize with Privy wallet if available
                setFormData({
                    username: "",
                    first_name: "",
                    last_name: "",
                    wallet_address: privyWalletAddress || "",
                });
            }

            setLoading(false);
        }

        loadProfile();
    }, [authenticated, user, privyWalletAddress]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Require wallet address (either from Privy or manually entered)
        if (!formData.wallet_address) {
            alert("Please enter a wallet address");
            return;
        }

        // Basic wallet address validation (should start with 0x and be 42 characters)
        const walletAddress = formData.wallet_address.trim();
        if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) {
            alert("Please enter a valid wallet address (should start with 0x and be 42 characters)");
            return;
        }

        setSaving(true);

        try {
            // Get or create user by wallet address
            const { data: userData } = await getOrUpsertUserByWallet(
                formData.wallet_address.toLowerCase(),
                {
                    username: formData.username,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                }
            );

            if (userData) {
                // Update profile (including wallet address in case it changed)
                await updateUserProfile(userData.id, {
                    username: formData.username,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    wallet_address: formData.wallet_address.toLowerCase(),
                });
                
                // Check if profile is complete
                if (formData.username && formData.first_name && formData.last_name && formData.wallet_address) {
                    setProfileComplete(true);
                }

                toast.success("Profile saved successfully!", {
                    description: "Your profile has been updated.",
                });
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Failed to save profile", {
                description: "Please try again.",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <CardContent className="pt-6">
                        <Trophy className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                        <div className="text-2xl font-bold">{stats.xp}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">XP</div>
                    </CardContent>
                </Card>
                <Card className="text-center">
                    <CardContent className="pt-6">
                        <Star
                            className="h-6 w-6 mx-auto mb-2"
                            style={{ color: getTierColor(stats.tier as UserTier).hex }}
                        />
                        <div
                            className="text-2xl font-bold capitalize"
                            style={{ color: getTierColor(stats.tier as UserTier).hex }}
                        >
                            {getTierColor(stats.tier as UserTier).label}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Tier</div>
                    </CardContent>
                </Card>
                <Card className="text-center">
                    <CardContent className="pt-6">
                        <FolderOpen className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                        <div className="text-2xl font-bold">{stats.projectCount}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Projects</div>
                    </CardContent>
                </Card>
                <Card className="text-center">
                    <CardContent className="pt-6">
                        <MessageSquare className="h-6 w-6 mx-auto text-green-500 mb-2" />
                        <div className="text-2xl font-bold">{stats.feedbackCount}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Feedback</div>
                    </CardContent>
                </Card>
            </div>

            {/* Project Status Counts */}
            {stats.projectCount > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Project Status</CardTitle>
                        <CardDescription>
                            Track your projects by their review status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-2" />
                                <div className="text-2xl font-bold text-green-500">{projectCounts.active}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Active</div>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-2" />
                                <div className="text-2xl font-bold text-yellow-500">{projectCounts.inReview}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Under Review</div>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                <XCircle className="h-5 w-5 mx-auto text-red-500 mb-2" />
                                <div className="text-2xl font-bold text-red-500">{projectCounts.archived}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Archived</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Project Review Info */}
            {projectCounts.inReview > 0 && (
                <Card className="border-blue-500/20 bg-blue-500/5">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-500 mb-1">
                                    Projects Under Review
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    You have {projectCounts.inReview} project{projectCounts.inReview !== 1 ? "s" : ""} currently under review. They will only appear publicly once approved by an admin. Active projects are visible to everyone.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Profile Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>
                        Complete your profile to start creating projects
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Wallet Address */}
                        <div>
                            <label
                                htmlFor="wallet_address"
                                className="block text-sm font-medium mb-2"
                            >
                                Wallet Address <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                id="wallet_address"
                                value={formData.wallet_address}
                                onChange={(e) =>
                                    setFormData({ ...formData, wallet_address: e.target.value.trim() })
                                }
                                required
                                className="font-mono text-sm"
                                placeholder="0x..."
                            />
                            {privyWalletAddress && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Connected via Privy: {privyWalletAddress.slice(0, 6)}...{privyWalletAddress.slice(-4)}
                                </p>
                            )}
                            {!privyWalletAddress && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    No wallet connected via Privy. Please enter your wallet address manually.
                                </p>
                            )}
                        </div>
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium mb-2"
                            >
                                Telegram Username <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">@</span>
                                <Input
                                    type="text"
                                    id="username"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({ ...formData, username: e.target.value.replace(/^@/, '') })
                                    }
                                    required
                                    className="pl-7"
                                    placeholder="username"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="first_name"
                                    className="block text-sm font-medium mb-2"
                                >
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    id="first_name"
                                    value={formData.first_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, first_name: e.target.value })
                                    }
                                    required
                                    placeholder="John"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="last_name"
                                    className="block text-sm font-medium mb-2"
                                >
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    id="last_name"
                                    value={formData.last_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, last_name: e.target.value })
                                    }
                                    required
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={saving}
                            className="w-full gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {profileComplete ? "Update Profile" : "Save Profile"}
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
