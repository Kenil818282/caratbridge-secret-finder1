import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { getApiKeys } from "@/lib/config"; // 👈 Import Config

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hashtagParam = searchParams.get("hashtag") || "diamond"; 
  const hashtags = hashtagParam.split(",").map(tag => tag.trim().replace("#", ""));

  // 🔒 GET TOKEN FROM SETTINGS
  const { APIFY_TOKEN } = getApiKeys();

  if (!APIFY_TOKEN) {
      return NextResponse.json({ error: "MISSING APIFY_TOKEN. Go to Settings Tab." });
  }

  try {
    const client = new ApifyClient({ token: APIFY_TOKEN });
    let allLeads: any[] = [];

    for (const tag of hashtags) {
        if (!tag) continue;
        console.log(`📸 INSTA HUNT: Scanning #${tag}...`);

        try {
            const run = await client.actor("apify/instagram-hashtag-scraper").call({
                "hashtags": [tag],
                "resultsLimit": 10,
            });

            const { items } = await client.dataset(run.defaultDatasetId).listItems();

            const tagLeads = items.map((item: any, index: number) => {
                const username = item.ownerUsername || (item.owner ? item.owner.username : "Unknown");
                const caption = item.caption || "";
                const emailMatch = caption.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
                const email = emailMatch ? emailMatch[0] : undefined;

                return {
                    id: `insta-${tag}-${index}-${Date.now()}`,
                    companyName: username,
                    website: `https://instagram.com/${username}`,
                    country: "Global", 
                    region: "Instagram",
                    businessType: `#${tag}`,
                    contactName: username,
                    contactRole: "Owner",
                    rawEmail: email,
                    predictedEmail: undefined, 
                    domain: "instagram.com",
                    emailVerificationStatus: email ? "valid" : "unknown",
                    score: item.likesCount ? Math.min(item.likesCount, 100) : 50,
                    notes: `Source: #${tag} | Post: "${caption.substring(0, 30)}..."`
                };
            });

            allLeads = [...allLeads, ...tagLeads];
        } catch (e) {
            console.error(`Failed to scan #${tag}`, e);
        }
    }

    return NextResponse.json(allLeads);

  } catch (error: any) {
    console.error("Insta Crash:", error);
    return NextResponse.json({ error: error.message });
  }
}