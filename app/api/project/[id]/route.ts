import { NextResponse } from "next/server";
import { getProjectById, updateProject, getUserByWallet, getUserByEmail } from "@/lib/supabase";
import { parseProjectSummary } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const { data, error } = await getProjectById(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const formData = await request.formData();

    const title = formData.get("title") as string;
    const intro = formData.get("intro") as string;
    const features = formData.get("features") as string;
    const whatToTest = formData.get("what_to_test") as string;
    const productLink = formData.get("product_link") as string | null;
    const walletAddress = formData.get("wallet_address") as string;
    const email = formData.get("email") as string;

    if (!title || !intro || !features || !whatToTest) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the project to verify ownership
    const { data: project, error: projectError } = await getProjectById(id);
    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify user ownership
    let user;
    if (walletAddress) {
      const result = await getUserByWallet(walletAddress);
      user = result.data;
    } else if (email) {
      const result = await getUserByEmail(email);
      user = result.data;
    }

    if (!user || user.id !== project.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse fields into markdown summary
    const summary = parseProjectSummary(intro, features, whatToTest, productLink || undefined);

    // Update project
    const { data: updatedProject, error: updateError } = await updateProject(id, {
      title,
      summary,
    });

    if (updateError || !updatedProject) {
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, project: updatedProject }, { status: 200 });
  } catch (error) {
    console.error("Error in updateProject API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
