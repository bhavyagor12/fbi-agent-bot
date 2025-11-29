"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Save, Loader2, Trophy, Star, MessageSquare, FolderOpen } from "lucide-react";
import {
    getOrUpsertUserByWallet,
    updateUserProfile,
    getUserByWallet,
    getUserStats,
} from "@/lib/supabase";

export default function SettingsForm() {
    const { user, authenticated } = usePrivy();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profileComplete, setProfileComplete] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        first_name: "",
        last_name: "",
    });
    const [stats, setStats] = useState({
        xp: 0,
        tier: "bronze",
        projectCount: 0,
        feedbackCount: 0,
    });

    // Fetch user profile on mount
    useEffect(() => {
        async function loadProfile() {
            if (!authenticated || !user?.wallet?.address) return;

            setLoading(true);
            const { data: userData } = await getUserByWallet(user.wallet.address);

            if (userData) {
                setFormData({
                    username: userData.username || "",
                    first_name: userData.first_name || "",
                    last_name: userData.last_name || "",
                });

                // Check if profile is complete
                if (userData.username && userData.first_name && userData.last_name) {
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
            }

            setLoading(false);
        }

        loadProfile();
    }, [authenticated, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.wallet?.address) return;

        setSaving(true);

        try {
            // Get or create user
            const { data: userData } = await getOrUpsertUserByWallet(
                user.wallet.address
            );

            if (userData) {
                // Update profile
                await updateUserProfile(userData.id, formData);
                setProfileComplete(true);
            }
        } catch (error) {
            console.error("Error saving profile:", error);
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
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 text-center shadow-sm">
                    <Trophy className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.xp}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">XP</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 text-center shadow-sm">
                    <Star className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                    <div className="text-2xl font-bold capitalize">{stats.tier}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Tier</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 text-center shadow-sm">
                    <FolderOpen className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.projectCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Projects</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 text-center shadow-sm">
                    <MessageSquare className="h-6 w-6 mx-auto text-green-500 mb-2" />
                    <div className="text-2xl font-bold">{stats.feedbackCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Feedback</div>
                </div>
            </div>

            {/* Profile Form */}
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-lg">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Profile Settings</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Complete your profile to start creating projects
                    </p>
                </div>

                {/* Wallet Address Display */}
                <div className="mb-6 rounded-lg bg-background/50 border border-border/50 p-4">
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Connected Wallet
                    </label>
                    <div className="font-mono text-sm text-foreground break-all">
                        {user?.wallet?.address}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-sm font-medium text-foreground mb-2"
                        >
                            Telegram Username <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-2.5 text-muted-foreground">@</span>
                            <input
                                type="text"
                                id="username"
                                value={formData.username}
                                onChange={(e) =>
                                    setFormData({ ...formData, username: e.target.value.replace(/^@/, '') })
                                }
                                disabled={profileComplete}
                                required
                                className="w-full rounded-lg border border-border/50 bg-background/50 pl-8 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                placeholder="username"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor="first_name"
                                className="block text-sm font-medium text-foreground mb-2"
                            >
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="first_name"
                                value={formData.first_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, first_name: e.target.value })
                                }
                                disabled={profileComplete}
                                required
                                className="w-full rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                placeholder="John"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="last_name"
                                className="block text-sm font-medium text-foreground mb-2"
                            >
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="last_name"
                                value={formData.last_name}
                                onChange={(e) =>
                                    setFormData({ ...formData, last_name: e.target.value })
                                }
                                disabled={profileComplete}
                                required
                                className="w-full rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    {!profileComplete && (
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Profile
                                </>
                            )}
                        </button>
                    )}

                    {profileComplete && (
                        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-center">
                            <p className="text-sm font-medium text-primary">
                                ✓ Profile complete! You can now create projects.
                            </p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
