import { NextResponse } from "next/server";
import { saveApiKeys, getApiKeys } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    saveApiKeys({
        serpapi_key: body.serpapi_key?.trim(),
        apify_token: body.apify_token?.trim(),
        discord_webhook: body.discord_webhook?.trim() // 👈 Save Discord
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  const keys = getApiKeys();
  return NextResponse.json({
      serpapi_key: keys.SERPAPI_KEY || "",
      apify_token: keys.APIFY_TOKEN || "",
      discord_webhook: keys.DISCORD_WEBHOOK || "", // 👈 Return Discord
      hasSerpApi: !!keys.SERPAPI_KEY,
      hasApify: !!keys.APIFY_TOKEN
  });
}