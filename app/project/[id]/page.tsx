"use client";

import {
  ArrowLeft,
  User,
  MessageSquare,
  TrendingUp,
  Shield,
  Zap,
  Award,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import * as React from "react";

// Extended Project Interface
interface Feedback {
  id: string;
  author: string;
  content: string;
  role?: string;
}

interface Score {
  category: string;
  value: number; // 0-100
  icon: React.ReactNode;
  description: string;
}

interface ProjectDetails {
  id: string;
  name: string;
  summary: string;
  author: string;
  fullDescription: string;
  feedbackSummary: string;
  feedbacks: Feedback[];
  scores: Score[];
}

// Mock Data Generator
const getProjectData = (id: string): ProjectDetails => {
  // In a real app, this would fetch based on ID.
  // For now, we return a rich mock object that works for any ID,
  // but we can customize the title to show it's dynamic.

  return {
    id,
    name: id === "1" ? "E-Commerce Platform" : "Project " + id,
    author: id === "1" ? "Sarah Chen" : "Demo User",
    summary:
      "A full-featured e-commerce solution with payment integration, inventory management, and customer analytics.",
    fullDescription:
      "This project aims to revolutionize the way small businesses handle online transactions. By integrating a robust payment gateway with real-time inventory tracking, it reduces manual overhead by 40%. The platform also includes a customer analytics dashboard that provides actionable insights into buying patterns, helping merchants optimize their stock and marketing strategies.",
    feedbackSummary:
      "The feedback for this project has been overwhelmingly positive, particularly regarding the user interface and the speed of the checkout process. Users have highlighted the intuitive dashboard as a key differentiator. However, some beta testers suggested adding more payment options for international customers.",
    feedbacks: [
      {
        id: "f1",
        author: "Michael Torrez",
        role: "Beta Tester",
        content:
          "The inventory management sync is a game changer. I used to spend hours updating spreadsheets, now it happens automatically.",
      },
      {
        id: "f2",
        author: "Jessica Wu",
        role: "UX Designer",
        content:
          "Clean aesthetics and very responsive. The mobile view needs a bit of work on the product gallery, but otherwise solid.",
      },
      {
        id: "f3",
        author: "David Miller",
        role: "Small Business Owner",
        content:
          "I love the analytics dashboard. It's simple enough for me to understand but gives me the data I need to make decisions.",
      },
    ],
    scores: [
      {
        category: "Innovation",
        value: 85,
        icon: <Zap className="h-5 w-5 text-yellow-500" />,
        description: "Novelty of the solution and technical approach",
      },
      {
        category: "Usability",
        value: 92,
        icon: <User className="h-5 w-5 text-blue-500" />,
        description: "Ease of use and user experience design",
      },
      {
        category: "Security",
        value: 88,
        icon: <Shield className="h-5 w-5 text-green-500" />,
        description: "Data protection and code safety measures",
      },
      {
        category: "Impact",
        value: 78,
        icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
        description: "Potential market impact and utility",
      },
    ],
  };
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const project = getProjectData(id);
  const [feedbackSearch, setFeedbackSearch] = React.useState("");

  const filteredFeedbacks = project.feedbacks.filter(
    (feedback) =>
      feedback.content.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
      feedback.author.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
      (feedback.role &&
        feedback.role.toLowerCase().includes(feedbackSearch.toLowerCase()))
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20">
      {/* Navigation */}
      <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              {project.name}
            </h1>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-sm font-bold text-primary-foreground">
                  {project.author.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {project.author}
                </p>
                <p className="text-xs text-muted-foreground">Project Lead</p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-muted-foreground leading-relaxed">
              {project.summary}
            </p>
          </div>
        </div>

        <hr className="border-border/50" />

        {/* Feedback Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              User Feedback
            </h2>
          </div>

          {/* Feedback Summary */}
          <div className="bg-card/50 border border-border/50 rounded-xl p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Feedback Summary
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {project.feedbackSummary}
            </p>
          </div>

          {/* Feedback Search and List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search feedback..."
                value={feedbackSearch}
                onChange={(e) => setFeedbackSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">User</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.length > 0 ? (
                    filteredFeedbacks.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {feedback.author}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {feedback.role}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          &quot;{feedback.content}&quot;
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <hr className="border-border/50" />

        {/* Scoring Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Project Scoring
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {project.scores.map((score) => (
              <div
                key={score.category}
                className="bg-card border border-border/50 rounded-xl p-6 relative overflow-hidden group hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background border border-border/50">
                      {score.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {score.category}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {score.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {score.value}
                    <span className="text-sm text-muted-foreground font-normal">
                      /100
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative z-10">
                  <div
                    className="h-full bg-primary transition-all duration-1000 ease-out group-hover:bg-primary/80"
                    style={{ width: `${score.value}%` }}
                  />
                </div>

                {/* Background Decoration */}
                <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
