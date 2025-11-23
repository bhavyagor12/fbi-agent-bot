"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import ProjectCard from "@/components/project-card";
import SearchBar from "@/components/search-bar";
import { useQuery } from "@tanstack/react-query";

export interface Project {
  id: number;
  title: string;
  summary: string;
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
  console.log("projects", projects);
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-[80%] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              FBI Project Archives
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Read through feedback and reviews for the projects of our users
            </p>
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
    </main>
  );
}
