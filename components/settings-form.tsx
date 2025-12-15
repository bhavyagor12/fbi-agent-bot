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
    getUserByEmail,
    getOrUpsertUserByEmail,
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

import { useUser } from "@/components/user-provider";

export default function SettingsForm() {
    const { user: privyUser, authenticated } = usePrivy();
    const { user: dbUser, refreshUser } = useUser();
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

    // Explicitly derive Privy details
    const privyWalletAddress = privyUser?.wallet?.address;
    const privyEmail = privyUser?.google?.email || privyUser?.email?.address;

    // Load profile from context or initialize
    useEffect(() => {
        async function loadProfile() {
            if (!authenticated) return;

            // If we have DB user from context, use it directly
            if (dbUser) {
                setFormData({
                    username: dbUser.username || "",
                    first_name: dbUser.first_name || "",
                    last_name: dbUser.last_name || "",
                    wallet_address: dbUser.wallet_address || privyWalletAddress || "",
                });

                const hasWallet = !!dbUser.wallet_address;
                const hasEmail = !!dbUser.email;
                if (dbUser.username && dbUser.first_name && dbUser.last_name && (hasWallet || hasEmail)) {
                    setProfileComplete(true);
                }

                // Fetch stats separately as they aren't in context fully
                const userStats = await getUserStats(dbUser.id);
                setStats({
                    xp: dbUser.xp || 0,
                    tier: dbUser.tier || "bronze",
                    projectCount: userStats.projectCount,
                    feedbackCount: userStats.feedbackCount,
                });

                return;
            }

            // If authenticated but no DB user (and provider finished loading? provider doesn't expose loading state here well enough to know if "null" means "not found" vs "loading")
            // But if dbUser is null, we can try to upsert if we really want to auto-create on this page.

            setLoading(true);

            let userData = null;

            // Only try to upsert if we are sure we don't have a user (logic below mimics original behavior)
            if (privyWalletAddress) {
                const result = await getOrUpsertUserByWallet(
                    privyWalletAddress.toLowerCase(),
                    { email: privyEmail || undefined }
                );
                userData = result.data;
            } else if (privyEmail) {
                const result = await getOrUpsertUserByEmail(privyEmail.toLowerCase());
                userData = result.data;
            }

            if (userData) {
                await refreshUser(); // Update global context
                // The useEffect will re-run with dbUser populated
            } else {
                // No user created/found
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
    }, [authenticated, dbUser, privyWalletAddress, privyEmail, refreshUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Require wallet address (either from Privy or manually entered) if no email
        if (!formData.wallet_address && !privyEmail) {
            alert("Please enter a wallet address");
            return;
        }

        // Basic wallet address validation if provided
        if (formData.wallet_address) {
            const walletAddress = formData.wallet_address.trim();
            if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) {
                alert("Please enter a valid wallet address (should start with 0x and be 42 characters)");
                return;
            }
        }

        setSaving(true);

        try {
            let userData = null;

            // If user has email from Privy (Google auth), use email-based upsert
            if (privyEmail) {
                const result = await getOrUpsertUserByEmail(
                    privyEmail.toLowerCase(),
                    {
                        username: formData.username,
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        wallet_address: formData.wallet_address || undefined,
                    }
                );
                userData = result.data;
            } else if (formData.wallet_address) {
                // Otherwise use wallet-based upsert
                const result = await getOrUpsertUserByWallet(
                    formData.wallet_address.toLowerCase(),
                    {
                        username: formData.username,
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                    }
                );
                userData = result.data;
            }

            if (userData) {
                // Update profile (including wallet address in case it changed)
                await updateUserProfile(userData.id, {
                    username: formData.username,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    wallet_address: formData.wallet_address.toLowerCase(),
                });

                // Check if profile is complete
                const hasWallet = !!formData.wallet_address;
                const hasEmail = !!privyEmail;
                if (formData.username && formData.first_name && formData.last_name && (hasWallet || hasEmail)) {
                    setProfileComplete(true);
                }

                toast.success("Profile saved successfully!", {
                    description: "Your profile has been updated.",
                });
                await refreshUser();
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
