import { NextResponse } from "next/server";
import { getAllProjects } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await getAllProjects();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
