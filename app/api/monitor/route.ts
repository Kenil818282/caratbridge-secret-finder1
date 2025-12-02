import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { getDb, saveDb, addLeadsToDb, addTag, removeTag, setRunningStatus } from "@/lib/db";
import { getApiKeys } from "@/lib/config";

export const runtime = 'nodejs'; 

// 🔔 DISCORD HELPER
async function sendDiscordAlert(webhookUrl: string, leads: any[]) {
    if (!webhookUrl || leads.length === 0) return;

    // Discord has a limit, so we send leads one by one or in small batches
    for (const lead of leads) {
        try {
            const payload = {
                username: "CaratBridge Watchtower",
                embeds: [{
                    title: `💎 New Lead: @${lead.companyName}`,
                    url: lead.website,
                    color: 3066993, // Green Color
                    fields: [
                        { name: "Source", value: lead.businessType, inline: true },
                        { name: "Score", value: `${lead.score}/100`, inline: true },
                        { name: "Content", value: lead.notes || "No caption" }
                    ],
                    footer: { text: "CaratBridge Secret Finder" },
                    timestamp: new Date().toISOString()
                }]
            };

            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Discord Send Failed", e);
        }
    }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, tag, force } = body;

    // --- STANDARD ACTIONS ---
    if (action === "start") { setRunningStatus(true); return NextResponse.json({ success: true }); }
    if (action === "stop") { setRunningStatus(false); return NextResponse.json({ success: true }); }
    if (action === "add" && tag) { addTag(tag); return NextResponse.json({ success: true }); }
    if (action === "remove" && tag) { removeTag(tag); return NextResponse.json({ success: true }); }
    if (action === "load") return NextResponse.json(getDb());

    // --- SCANNER ---
    if (action === "scan") {
      const { APIFY_TOKEN, DISCORD_WEBHOOK } = getApiKeys(); // 👈 GET WEBHOOK

      if (!APIFY_TOKEN) return NextResponse.json({ error: "Missing APIFY_TOKEN" });

      const db = getDb();
      if (!db.isRunning && !force) return NextResponse.json({ success: false, message: "Paused" });

      const client = new ApifyClient({ token: APIFY_TOKEN });
      let totalNewCount = 0;

      for (const monitoredTag of db.monitoredTags) {
        try {
          const run = await client.actor("apify/instagram-hashtag-scraper").call({
              "hashtags": [monitoredTag],
              "resultsLimit": 3, 
          });
          const { items } = await client.dataset(run.defaultDatasetId).listItems();

          if (items && items.length > 0) {
              const leads = items.map((item: any, index: number) => {
                   const username = item.ownerUsername || item.owner?.username || "Unknown";
                   const caption = item.caption || "";
                   const emailMatch = caption.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
                   return {
                      id: `watch-${monitoredTag}-${item.id || index}`,
                      companyName: username,
                      website: `https://instagram.com/${username}`,
                      country: "Global",
                      region: "Instagram",
                      businessType: `#${monitoredTag}`,
                      contactName: username,
                      contactRole: "Owner",
                      rawEmail: emailMatch ? emailMatch[0] : undefined,
                      predictedEmail: undefined,
                      domain: "instagram.com",
                      emailVerificationStatus: emailMatch ? "valid" : "unknown",
                      score: 90, 
                      notes: `NEW POST: "${caption.substring(0, 30)}..."`
                   };
              });

              // 🆕 SAVE AND GET NEW LEADS
              const newLeadsFound = addLeadsToDb(leads);

              // 🔔 SEND TO DISCORD
              if (newLeadsFound.length > 0 && DISCORD_WEBHOOK) {
                  console.log(`Sending ${newLeadsFound.length} alerts to Discord...`);
                  await sendDiscordAlert(DISCORD_WEBHOOK, newLeadsFound);
              }

              totalNewCount += newLeadsFound.length;
          }
        } catch (e) { console.error(e); }
      }
      return NextResponse.json({ success: true, newLeads: totalNewCount });
    }

    return NextResponse.json({ error: "Invalid Action" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}