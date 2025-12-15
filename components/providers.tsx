"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { Toaster } from "sonner";
import { useState } from "react";
import { UserProvider } from "./user-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#676FFF",
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          {children}
        </UserProvider>
        <Toaster theme="dark" />
      </QueryClientProvider>
    </PrivyProvider>
  );
}
