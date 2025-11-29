"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
            <div className="h-9 w-32 rounded-lg border bg-card/50 animate-pulse" />
        );
    }

    if (authenticated && walletAddress) {
        return (
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-2 py-2 px-4">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-mono">{shortenAddress(walletAddress)}</span>
                </Badge>
                <Button
                    onClick={logout}
                    variant="outline"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    aria-label="Disconnect wallet"
                >
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <Button
            onClick={login}
            variant="default"
            className="gap-2"
        >
            <Wallet className="h-4 w-4" />
            <span>Connect Wallet</span>
        </Button>
    );
}
