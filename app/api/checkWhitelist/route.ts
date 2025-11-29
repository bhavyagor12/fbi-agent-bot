import { NextRequest, NextResponse } from "next/server";
import { isWalletWhitelisted } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const { isWhitelisted, error } = await isWalletWhitelisted(walletAddress);

    if (error) {
      console.error("Error checking whitelist:", error);
    }

    return NextResponse.json({ isWhitelisted });
  } catch (error) {
    console.error("Error in checkWhitelist API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
