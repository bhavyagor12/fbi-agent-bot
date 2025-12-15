import { NextResponse } from "next/server";
import { getUnapprovedUsers } from "@/lib/supabase";

export async function GET() {
    try {
        const { data, error } = await getUnapprovedUsers();

        if (error) {
            console.error("Error fetching unapproved users:", error);
            return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error("Error in getUnapprovedUsers:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
