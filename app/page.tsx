"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import ProjectCard from "@/components/project-card";
import SearchBar from "@/components/search-bar";

export interface Project {
  id: string;
  name: string;
  summary: string;
  author: string;
}

// Sample project data
const SAMPLE_PROJECTS: Project[] = [
  {
    id: "1",
    name: "E-Commerce Platform",
    summary:
      "A full-featured e-commerce solution with payment integration, inventory management, and customer analytics.",
    author: "Sarah Chen",
  },
  {
    id: "2",
    name: "Project Management Tool",
    summary:
      "Collaborative project management app with real-time updates, task tracking, and team communication features.",
    author: "Alex Rodriguez",
  },
  {
    id: "3",
    name: "AI Content Generator",
    summary:
      "Generate high-quality content using advanced AI models with customizable templates and bulk operations.",
    author: "Jamie Lee",
  },
  {
    id: "4",
    name: "Social Media Analytics",
    summary:
      "Track and analyze social media metrics across platforms with detailed insights and automated reporting.",
    author: "Marcus Johnson",
  },
  {
    id: "5",
    name: "Video Streaming Platform",
    summary:
      "Build your own video streaming service with adaptive bitrate, live streaming, and interactive features.",
    author: "Lisa Wang",
  },
  {
    id: "6",
    name: "Task Automation Suite",
    summary:
      "Automate repetitive workflows with visual workflow builder, integrations, and scheduling capabilities.",
    author: "David Kim",
  },
  {
    id: "7",
    name: "Data Visualization Dashboard",
    summary:
      "Create interactive dashboards with real-time data visualization, custom charts, and drill-down analytics.",
    author: "Emma Thompson",
  },
  {
    id: "8",
    name: "Learning Management System",
    summary:
      "Comprehensive LMS with course management, student tracking, quizzes, and certification features.",
    author: "Raj Patel",
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    return SAMPLE_PROJECTS.filter((project) => {
      return (
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
              {filteredProjects.length} project
              {filteredProjects.length !== 1 ? "s" : ""} found
            </div>

            {/* Projects Grid */}
            {filteredProjects.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
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
