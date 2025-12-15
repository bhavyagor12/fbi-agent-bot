"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getUserByWallet, getUserByEmail } from "@/lib/supabase";

export interface DBUser {
    id: number;
    created_at: string;
    email: string | null;
    wallet_address: string | null;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    telegram_user_id: number | null;
    profile_picture_url: string | null;
    approved: boolean;
    xp?: number;
    tier?: string;
    role?: string;
}

interface UserContextType {
    user: DBUser | null;
    isLoading: boolean;
    isWhitelisted: boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { authenticated, user: privyUser, ready } = usePrivy();
    const [user, setUser] = useState<DBUser | null>(null);
    const [isWhitelisted, setIsWhitelisted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        if (!ready) return;

        if (!authenticated) {
            setUser(null);
            setIsWhitelisted(false);
            setIsLoading(false);
            return;
        }

        // Don't set loading to true on refresh if we already have data? 
        // Maybe we want background refresh. But for now, simple approach.
        // If it's a hard refresh (isLoading=false initially), set it. 
        // But we initialized isLoading=true.

        try {
            const privyWallet = privyUser?.wallet?.address?.toLowerCase();
            const privyEmail = privyUser?.google?.email || privyUser?.email?.address;

            let dbUser = null;

            // 1. Try by wallet
            if (privyWallet) {
                const { data } = await getUserByWallet(privyWallet);
                dbUser = data;
            }

            // 2. Try by email if not found
            if (!dbUser && privyEmail) {
                const { data } = await getUserByEmail(privyEmail.toLowerCase());
                dbUser = data;
            }

            setUser(dbUser);

            // 3. Check whitelist using the BEST address
            let addressToCheck = privyWallet;
            if (dbUser?.wallet_address) {
                addressToCheck = dbUser.wallet_address;
            }

            if (addressToCheck) {
                const res = await fetch(
                    `/api/checkWhitelist?wallet=${encodeURIComponent(addressToCheck)}`
                );
                const data = await res.json();
                setIsWhitelisted(data.isWhitelisted);
            } else {
                setIsWhitelisted(false);
            }

        } catch (error) {
            console.error("Error fetching user details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, authenticated, privyUser]);

    return (
        <UserContext.Provider value={{ user, isLoading, isWhitelisted, refreshUser: fetchUser }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
