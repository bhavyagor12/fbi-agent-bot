"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/app/page";
import { Card } from "@/components/ui/card";

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
    <Link href={`/project/${project.id}`} className="block">
      <Card className="group flex flex-col transition-all hover:border-primary/50 hover:shadow-lg overflow-hidden h-full">
        <div className="flex flex-col flex-1 p-6">
          <div className="flex-1">
            <h3 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-3">
              {project.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {project.summary}
            </p>
          </div>

          <div className="flex items-center justify-between pt-6 mt-6 border-t">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary-foreground">
                  {authorInitial}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="text-sm font-medium truncate">{fullName}</div>
                {username && (
                  <div className="text-xs text-muted-foreground truncate">
                    @{username}
                  </div>
                )}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-4" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
