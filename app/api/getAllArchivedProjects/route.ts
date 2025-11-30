import { NextResponse } from "next/server";
import { getArchivedProjects } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await getArchivedProjects();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch archived projects" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error("Error in getAllArchivedProjects API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

