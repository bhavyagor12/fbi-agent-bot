import { NextRequest, NextResponse } from "next/server";
import { getOrUpsertUserByWallet } from "@/lib/supabase";
import { createProjectWithAttachments } from "@/lib/supabase";
import { uploadFiles } from "@/lib/supabase-storage";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const title = formData.get("title") as string;
        const summary = formData.get("summary") as string;
        const walletAddress = formData.get("wallet_address") as string;

        if (!title || !summary || !walletAddress) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get or create user
        const { data: user, error: userError } = await getOrUpsertUserByWallet(
            walletAddress
        );

        if (userError || !user) {
            return NextResponse.json(
                { error: "Failed to get user" },
                { status: 500 }
            );
        }

        // Validate profile completeness
        const missingFields: string[] = [];
        if (!user.username) missingFields.push("Telegram username");
        if (!user.first_name) missingFields.push("First name");
        if (!user.last_name) missingFields.push("Last name");

        if (missingFields.length > 0) {
            return NextResponse.json(
                {
                    error: "Profile incomplete",
                    missingFields,
                },
                { status: 400 }
            );
        }

        // Upload files if any
        const files = formData.getAll("files") as File[];
        let attachmentUrls: Array<{ url: string; media_type: string }> = [];

        if (files.length > 0) {
            const basePath = `projects/${user.id}`;
            attachmentUrls = await uploadFiles(files, basePath);
        }

        // Create project with attachments
        const { data: project, error: projectError } =
            await createProjectWithAttachments(
                {
                    title,
                    summary,
                    user_id: user.id,
                },
                attachmentUrls
            );

        if (projectError || !project) {
            return NextResponse.json(
                { error: "Failed to create project" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, project }, { status: 201 });
    } catch (error) {
        console.error("Error in createProject API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
