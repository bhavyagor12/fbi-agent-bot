"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Wallet, LogOut } from "lucide-react";
import SettingsForm from "@/components/settings-form";
import WalletConnectButton from "@/components/wallet-connect-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  const { authenticated, ready, logout } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="max-w-md text-center">
              <CardHeader>
                <Wallet className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
                <CardDescription>
                  Please connect your wallet to access settings
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <WalletConnectButton />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your profile and connections
            </p>
          </div>
          <Button
            onClick={() => logout()}
            variant="outline"
            className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <SettingsForm />
        </div>
      </div>
    </div>
  );
}
