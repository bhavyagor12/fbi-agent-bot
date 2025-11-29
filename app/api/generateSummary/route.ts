import { NextRequest, NextResponse } from "next/server";
import { getFeedbackByProjectId, updateProjectSummary } from "@/lib/supabase";
import { summarizeFeedback } from "@/lib/ai";

export async function POST(request: NextRequest) {
    try {
        const { projectId } = await request.json();

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        // Fetch all feedback for the project
        const { data: feedback, error: feedbackError } =
            await getFeedbackByProjectId(projectId);

        if (feedbackError) {
            return NextResponse.json(
                { error: "Failed to fetch feedback" },
                { status: 500 }
            );
        }

        if (!feedback || feedback.length === 0) {
            return NextResponse.json(
                { error: "No feedback available to summarize" },
                { status: 400 }
            );
        }

        // Format feedback for AI
        const formattedFeedback = feedback.map((item) => ({
            content: item.content || "",
            media_url: item.media_url,
        }));

        // Generate summary using existing AI function
        const summary = await summarizeFeedback(formattedFeedback);

        if (!summary) {
            return NextResponse.json(
                { error: "Failed to generate summary" },
                { status: 500 }
            );
        }

        // Update project with generated summary
        const { error: updateError } = await updateProjectSummary(
            projectId,
            summary
        );

        if (updateError) {
            console.error("Error updating project summary:", updateError);
            // Still return the summary even if update fails
        }

        return NextResponse.json({ success: true, summary }, { status: 200 });
    } catch (error) {
        console.error("Error in generateSummary API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
