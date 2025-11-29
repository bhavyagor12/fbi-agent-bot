"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/app/page";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Link href={`/project/${project.id}`} className="block h-full">
      <Card className="group h-full flex flex-col transition-all hover:border-primary/50 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
            {project.title}
          </CardTitle>
          <CardDescription className="line-clamp-3 leading-relaxed">
            {project.summary}
          </CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">
                  {authorInitial}
                </span>
              </div>
              <div className="flex flex-col">
                <div className="text-sm font-medium">{fullName}</div>
                {username && (
                  <div className="text-xs text-muted-foreground">
                    @{username}
                  </div>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
