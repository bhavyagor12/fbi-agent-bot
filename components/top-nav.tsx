"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Settings, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletConnectButton from "@/components/wallet-connect-button";
import CreateProjectForm from "@/components/create-project-form";
import { Separator } from "@/components/ui/separator";

export default function TopNav() {
  const { authenticated, ready, user } = usePrivy();
  const pathname = usePathname();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  const walletAddress = user?.wallet?.address;

  // Check if wallet is whitelisted
  useEffect(() => {
    async function checkWhitelist() {
      if (!authenticated || !walletAddress) {
        setIsWhitelisted(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/checkWhitelist?wallet=${encodeURIComponent(walletAddress)}`
        );
        const data = await res.json();
        setIsWhitelisted(data.isWhitelisted);
      } catch (error) {
        console.error("Error checking whitelist:", error);
        setIsWhitelisted(false);
      }
    }

    if (ready) {
      checkWhitelist();
    }
  }, [authenticated, walletAddress, ready]);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-[90%] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Logo/Brand */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-lg font-bold text-primary-foreground">
                    F
                  </span>
                </div>
                <span className="text-xl font-bold text-foreground">
                  FBI Archives
                </span>
              </Link>

              <Separator orientation="vertical" className="h-6" />

              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/">
                  <Button
                    variant={pathname === "/" ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Projects
                  </Button>
                </Link>

                {authenticated && isWhitelisted && (
                  <Link href="/review">
                    <Button
                      variant={pathname === "/review" ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Review
                    </Button>
                  </Link>
                )}

                {authenticated && (
                  <Link href="/settings">
                    <Button
                      variant={
                        pathname === "/settings" ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
              {authenticated && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  size="sm"
                  className="hidden sm:flex"
                >
                  Create Project
                </Button>
              )}
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Create Project Modal */}
      {showCreateForm && (
        <CreateProjectForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

