"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Wallet, LogOut } from "lucide-react";

export default function WalletConnectButton() {
    const { ready, authenticated, login, logout, user } = usePrivy();

    // Get wallet address
    const walletAddress = user?.wallet?.address;

    // Shorten address for display
    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (!ready) {
        return (
            <div className="h-10 w-32 rounded-lg border bg-card/50 animate-pulse" />
        );
    }

    if (authenticated && walletAddress) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-mono">{shortenAddress(walletAddress)}</span>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    aria-label="Disconnect wallet"
                >
                    <LogOut className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={login}
            className="group relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-2.5 text-sm font-semibold text-primary transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
            </div>
        </button>
    );
}
