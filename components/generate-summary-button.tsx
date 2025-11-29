"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface GenerateSummaryButtonProps {
    projectId: number;
    currentSummary?: string | null;
    onSummaryGenerated?: (summary: string) => void;
}

export default function GenerateSummaryButton({
    projectId,
    currentSummary,
    onSummaryGenerated,
}: GenerateSummaryButtonProps) {
    const [generating, setGenerating] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [generatedSummary, setGeneratedSummary] = useState<string | null>(
        currentSummary || null
    );

    const handleGenerate = async () => {
        setGenerating(true);

        try {
            const response = await fetch("/api/generateSummary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate summary");
            }

            const data = await response.json();
            setGeneratedSummary(data.summary);
            setShowSummary(true);
            onSummaryGenerated?.(data.summary);
        } catch (error) {
            console.error("Error generating summary:", error);
            alert("Failed to generate summary. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <Button
                onClick={handleGenerate}
                disabled={generating}
                variant="outline"
                className="gap-2"
            >
                {generating ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles className="h-4 w-4" />
                        Generate AI Summary
                    </>
                )}
            </Button>

            {/* Summary Dialog */}
            <Dialog open={showSummary} onOpenChange={setShowSummary}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            AI-Generated Summary
                        </DialogTitle>
                        <DialogDescription>
                            Summary of all feedback for this project
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-foreground leading-relaxed">
                            {generatedSummary}
                        </p>
                    </div>
                    <Button onClick={() => setShowSummary(false)} className="w-full">
                        Close
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
