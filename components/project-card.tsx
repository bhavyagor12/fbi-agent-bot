"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/app/page";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  // Derive author information from users object
  const firstName = project.users?.first_name || "";
  const lastName = project.users?.last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
  const username = project.users?.username;
  const authorInitial = fullName.charAt(0).toUpperCase();

  return (
    <div className="group rounded-lg border border-border/50 bg-card p-6 hover:border-primary/50 hover:bg-card/50 transition-all hover:shadow-lg h-full flex flex-col">
      <Link href={`/project/${project.id}`} className="grow">
        {/* Project Name */}
        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2 cursor-pointer">
          {project.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
          {project.summary}
        </p>
      </Link>

      {/* Footer */}
      <Link href={`/project/${project.id}`}>
        <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-auto cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">
                {authorInitial}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="text-sm text-foreground font-medium">
                {fullName}
              </div>
              {username && (
                <div className="text-xs text-muted-foreground/70">
                  @{username}
                </div>
              )}
            </div>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </Link>
    </div>
  );
}
