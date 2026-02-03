import { NextRequest, NextResponse } from "next/server";

const FIRST_DOLLAR_ONCHAIN_SCORE_URL =
  "https://app.firstdollar.money/api/onchain-score";

/**
 * Proxies onchain score requests to First Dollar API
 *
 * POST /api/onchain-score
 * Request body: { "telegram_username": "pratzyy" }
 *
 * Forwards to: POST https://app.firstdollar.money/api/onchain-score
 *
 * Returns:
 * - 200 OK: { "onchain_score": 78 }
 * - 400 Bad Request: { "error": "Invalid telegram username" }
 * - 404 Not Found: { "error": "User not found" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegram_username } = body;

    if (!telegram_username || typeof telegram_username !== "string") {
      return NextResponse.json(
        { error: "Invalid telegram username" },
        { status: 400 }
      );
    }

    const cleanUsername = telegram_username.replace(/^@/, "").trim();
    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Invalid telegram username" },
        { status: 400 }
      );
    }

    const response = await fetch(FIRST_DOLLAR_ONCHAIN_SCORE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_username: cleanUsername }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        data?.error ? { error: data.error } : { error: "Request failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error in onchain-score API:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
