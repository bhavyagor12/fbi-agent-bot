"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

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
            <button
                onClick={handleGenerate}
                disabled={generating}
                className="group flex items-center gap-2 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2 text-sm font-semibold text-primary transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </button>

            {/* Summary Modal */}
            {showSummary && generatedSummary && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setShowSummary(false)}
                >
                    <div
                        className="bg-card/95 backdrop-blur-md rounded-2xl border border-border/50 shadow-2xl w-full max-w-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">
                                AI-Generated Summary
                            </h3>
                        </div>

                        <div className="rounded-lg bg-background/50 border border-border/50 p-4 mb-4">
                            <p className="text-foreground leading-relaxed">
                                {generatedSummary}
                            </p>
                        </div>

                        <button
                            onClick={() => setShowSummary(false)}
                            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
