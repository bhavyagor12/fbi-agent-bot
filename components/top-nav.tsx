"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/components/user-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Home, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletConnectButton from "@/components/wallet-connect-button";
import CreateProjectForm from "@/components/create-project-form";
import { Separator } from "@/components/ui/separator";

export default function TopNav() {
  const { authenticated } = usePrivy();
  const { isWhitelisted } = useUser();
  const pathname = usePathname();
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-[90%] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Logo/Brand */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Radar className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">
                  Radar Room
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

