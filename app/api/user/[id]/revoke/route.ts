import { NextResponse } from "next/server";
import { revokeUserApproval } from "@/lib/supabase";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }

        const { data, error } = await revokeUserApproval(userId);

        if (error) {
            console.error("Error revoking user approval:", error);
            return NextResponse.json({ error: "Failed to revoke approval" }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: data });
    } catch (error) {
        console.error("Error in revokeUserApproval:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
