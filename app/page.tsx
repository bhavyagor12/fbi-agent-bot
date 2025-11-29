"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Settings as SettingsIcon } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import ProjectCard from "@/components/project-card";
import SearchBar from "@/components/search-bar";
import WalletConnectButton from "@/components/wallet-connect-button";
import CreateProjectForm from "@/components/create-project-form";
import { useQuery } from "@tanstack/react-query";

export interface Project {
  id: number;
  title: string;
  summary: string;
  user_id?: number;
  feedback_summary?: string | null;
  users: {
    first_name: string;
    last_name: string;
    username: string;
  };
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { authenticated, ready } = usePrivy();
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const {
    data: projects = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["projects", debouncedSearchQuery],
    queryFn: async () => {
      const url = debouncedSearchQuery
        ? `/api/getAllActiveProjects/query?query=${encodeURIComponent(
          debouncedSearchQuery
        )}`
        : "/api/getAllActiveProjects";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      return res.json();
    },
  });
  return (
    <main className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-[80%] px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                FBI Project Archives
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                Read through feedback and reviews for the projects of our users
              </p>
            </div>
            <div className="flex items-center gap-3">
              {authenticated && (
                <>
                  <Link href="/settings">
                    <button className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-card">
                      <SettingsIcon className="h-4 w-4" />
                      Settings
                    </button>
                  </Link>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Create Project
                  </button>
                </>
              )}
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[80%] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8">
          {/* Projects Grid */}
          <div className="w-full">
            {/* Search Bar */}
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            {/* Results Count */}
            <div className="mb-6 text-sm text-muted-foreground">
              {isLoading ? (
                "Loading..."
              ) : isError ? (
                "Error loading projects"
              ) : (
                <>
                  {projects.length} project
                  {projects.length !== 1 ? "s" : ""} found
                </>
              )}
            </div>

            {/* Projects Grid */}
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-xl border bg-card/50 animate-pulse"
                  />
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project: Project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/50 p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  No projects found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateForm && (
        <CreateProjectForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            // Refetch projects
            window.location.reload();
          }}
        />
      )}
    </main>
  );
}
