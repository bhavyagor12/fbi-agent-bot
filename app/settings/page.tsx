"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Wallet } from "lucide-react";
import SettingsForm from "@/components/settings-form";
import WalletConnectButton from "@/components/wallet-connect-button";

export default function SettingsPage() {
    const { authenticated, ready, user } = usePrivy();
    const router = useRouter();

    if (!ready) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
                <div className="border-b border-border/50">
                    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            Settings
                        </h1>
                    </div>
                </div>

                <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-12 text-center shadow-lg">
                        <Wallet className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            Connect Your Wallet
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Please connect your wallet to access settings
                        </p>
                        <div className="flex justify-center">
                            <WalletConnectButton />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b border-border/50">
                <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <button
                                onClick={() => router.push("/")}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                            >
                                ← Back to Projects
                            </button>
                            <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                <SettingsIcon className="h-8 w-8" />
                                Settings
                            </h1>
                            <p className="mt-2 text-lg text-muted-foreground">
                                Manage your profile and connections
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="space-y-6">
                    {/* Profile Form */}
                    <SettingsForm />
                </div>
            </div>
        </div>
    );
}
