"use client";

import { ArrowRight } from "lucide-react";
import type { Project } from "@/app/page";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="group rounded-lg border border-border/50 bg-card p-6 hover:border-primary/50 hover:bg-card/50 transition-all hover:shadow-lg cursor-pointer">
      {/* Project Name */}
      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {project.name}
      </h3>

      {/* Summary */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
        {project.summary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">
              {project.author.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">{project.author}</div>
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}
