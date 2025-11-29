"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { linkTelegramToWallet, getUserByWallet } from "@/lib/supabase";
import { MessageCircle, CheckCircle2 } from "lucide-react";

declare global {
    interface Window {
        TelegramLoginWidget?: {
            onAuth: (user: TelegramUser) => void;
        };
    }
}

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

export default function TelegramAuthWidget() {
    const { user, authenticated } = usePrivy();
    const [linked, setLinked] = useState(false);
    const [loading, setLoading] = useState(true);
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    // Check if Telegram is already linked
    useEffect(() => {
        async function checkLinked() {
            if (!authenticated || !user?.wallet?.address) {
                setLoading(false);
                return;
            }

            const { data: userData } = await getUserByWallet(user.wallet.address);
            if (userData?.telegram_user_id) {
                setLinked(true);
            }
            setLoading(false);
        }

        checkLinked();
    }, [authenticated, user]);

    // Load Telegram Login Widget script
    useEffect(() => {
        if (linked || !authenticated) return;

        const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
        if (!botUsername) {
            console.error("Telegram bot username not configured");
            return;
        }

        // Define callback function
        window.TelegramLoginWidget = {
            onAuth: async (telegramUser: TelegramUser) => {
                if (!user?.wallet?.address) return;

                try {
                    await linkTelegramToWallet(telegramUser.id, user.wallet.address);
                    setLinked(true);
                } catch (error) {
                    console.error("Error linking Telegram:", error);
                }
            },
        };

        // Load script
        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", botUsername);
        script.setAttribute("data-size", "large");
        script.setAttribute("data-radius", "8");
        script.setAttribute(
            "data-onauth",
            "window.TelegramLoginWidget.onAuth(user)"
        );
        script.setAttribute("data-request-access", "write");
        script.async = true;

        scriptRef.current = script;
        document.getElementById("telegram-login-container")?.appendChild(script);

        return () => {
            if (scriptRef.current) {
                scriptRef.current.remove();
            }
        };
    }, [linked, authenticated, user]);

    if (!authenticated) {
        return null;
    }

    if (loading) {
        return (
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-lg">
                <div className="h-20 animate-pulse bg-muted/20 rounded-lg" />
            </div>
        );
    }

    if (linked) {
        return (
            <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">
                            Telegram Connected
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Your Telegram account is linked
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0088cc]/10">
                    <MessageCircle className="h-6 w-6 text-[#0088cc]" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Link Telegram</h3>
                    <p className="text-sm text-muted-foreground">
                        Connect your Telegram account
                    </p>
                </div>
            </div>

            <div id="telegram-login-container" className="flex justify-center" />
        </div>
    );
}
