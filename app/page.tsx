"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import ProjectCard from "@/components/project-card";
import SearchBar from "@/components/search-bar";
import { useQuery } from "@tanstack/react-query";

export interface ProjectAttachment {
  id: number;
  url: string;
  media_type: string;
}

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
  project_attachments?: ProjectAttachment[];
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[90%] px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Project Archives
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse and search through all active projects
            </p>
          </div>

          {/* Search Bar */}
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-96 rounded-xl border bg-card/50 animate-pulse"
                />
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
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
    </main>
  );
}
