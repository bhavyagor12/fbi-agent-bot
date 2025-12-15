import { NextResponse } from "next/server";
import { getApprovedUsers } from "@/lib/supabase";

export async function GET() {
    try {
        const { data, error } = await getApprovedUsers();

        if (error) {
            console.error("Error fetching approved users:", error);
            return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error("Error in getApprovedUsers:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
