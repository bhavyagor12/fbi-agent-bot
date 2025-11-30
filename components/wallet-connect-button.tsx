"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Wallet, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserByWallet } from "@/lib/supabase";

export default function WalletConnectButton() {
    const { ready, authenticated, login, logout, user } = usePrivy();
    const router = useRouter();
    const [tgUsername, setTgUsername] = useState<string | null>(null);

    // Get wallet address
    const walletAddress = user?.wallet?.address;
    
    // Get Google account info
    const googleAccount = user?.google;
    const googleEmail = googleAccount?.email;
    const googleName = googleAccount?.name;
    
    // Get email account info (fallback)
    const emailAccount = user?.email;
    const emailAddress = emailAccount?.address;

    // Fetch Telegram username from database
    useEffect(() => {
        async function fetchTgUsername() {
            if (!authenticated || !walletAddress) {
                setTgUsername(null);
                return;
            }

            try {
                const { data: userData } = await getUserByWallet(walletAddress.toLowerCase());
                if (userData?.username) {
                    setTgUsername(userData.username);
                }
            } catch (error) {
                console.error("Error fetching TG username:", error);
            }
        }

        if (ready && authenticated && walletAddress) {
            fetchTgUsername();
        }
    }, [ready, authenticated, walletAddress]);

    // Shorten address for display
    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Get display name/identifier (prioritize TG username)
    const getDisplayName = () => {
        if (tgUsername) {
            return `@${tgUsername}`;
        }
        if (walletAddress) {
            return shortenAddress(walletAddress);
        }
        if (googleName) {
            return googleName;
        }
        if (googleEmail) {
            return googleEmail.split("@")[0];
        }
        if (emailAddress) {
            return emailAddress.split("@")[0];
        }
        return "User";
    };

    // Get display icon
    const getDisplayIcon = () => {
        if (walletAddress) {
            return <Wallet className="h-4 w-4 text-primary" />;
        }
        return <User className="h-4 w-4 text-primary" />;
    };

    const handleProfileClick = () => {
        router.push("/settings");
    };

    if (!ready) {
        return (
            <div className="h-9 w-32 rounded-lg border bg-card/50 animate-pulse" />
        );
    }

    if (authenticated) {
        return (
            <div className="flex items-center gap-2">
                <Badge 
                    variant="outline" 
                    className="gap-2 py-2 px-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={handleProfileClick}
                >
                    {getDisplayIcon()}
                    <span className={walletAddress && !tgUsername ? "font-mono" : ""}>{getDisplayName()}</span>
                </Badge>
                <Button
                    onClick={logout}
                    variant="outline"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    aria-label="Logout"
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
