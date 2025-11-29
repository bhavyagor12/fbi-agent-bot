import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Insert wallet address in lowercase to match the check function
    const { data, error } = await supabaseServer
      .from("whitelist")
      .insert({ wallet_address: walletAddress.toLowerCase() })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate error
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Wallet address already whitelisted", data: null },
          { status: 200 }
        );
      }
      console.error("Error adding to whitelist:", error);
      return NextResponse.json(
        { error: "Failed to add wallet to whitelist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Wallet added to whitelist successfully",
      data 
    });
  } catch (error) {
    console.error("Error in addToWhitelist API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

