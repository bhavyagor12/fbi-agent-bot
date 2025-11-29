import { NextResponse } from "next/server";
import { getInReviewProjects } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await getInReviewProjects();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
