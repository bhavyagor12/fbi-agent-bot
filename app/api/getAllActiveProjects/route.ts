import { NextResponse } from "next/server";
import { getActiveProjects } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await getActiveProjects();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
