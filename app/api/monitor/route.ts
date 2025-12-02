import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { getDb, saveDb, addLeadsToDb, addTag, removeTag, setRunningStatus } from "@/lib/db";
import { getApiKeys } from "@/lib/config";

export const runtime = 'nodejs'; 
export const maxDuration = 60; 

// 🧠 HELPER: Calculate "Time Ago"
function getTimeAgo(isoDate: string) {
    if (!isoDate) return "Unknown date";
    const created = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime(); // Difference in milliseconds
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return `Just now (${diffSecs}s ago)`;
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
}

// 🔔 DISCORD SENDER (Updated with Time Field)
async function sendDiscordAlert(webhookUrl: string, leads: any[]) {
    if (!webhookUrl || leads.length === 0) return;
    for (const lead of leads) {
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: "CaratBridge Watchtower",
                    embeds: [{
                        title: `💎 New Post: @${lead.companyName}`,
                        url: lead.website,
                        color: 3066993, // Green
                        fields: [
                            { name: "Source", value: lead.businessType, inline: true },
                            { name: "⏰ Posted", value: lead.postAge || "Unknown", inline: true }, // 🆕 NEW FIELD
                            { name: "Caption", value: lead.notes || "No caption" }
                        ],
                        footer: { text: "CaratBridge Secret Finder" },
                        timestamp: new Date().toISOString()
                    }]
                })
            });
        } catch (e) { console.error("Discord Error", e); }
    }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, tag, force } = body;

    // --- STANDARD ACTIONS ---
    if (action === "start") { setRunningStatus(true); return NextResponse.json({ success: true, message: "Started" }); }
    if (action === "stop") { setRunningStatus(false); return NextResponse.json({ success: true, message: "Stopped" }); }
    if (action === "add" && tag) { addTag(tag); return NextResponse.json({ success: true }); }
    if (action === "remove" && tag) { removeTag(tag); return NextResponse.json({ success: true }); }
    if (action === "load") return NextResponse.json(getDb());

    // --- SCANNER ---
    if (action === "scan") {
      const { APIFY_TOKEN, DISCORD_WEBHOOK } = getApiKeys();
      if (!APIFY_TOKEN) return NextResponse.json({ error: "Missing APIFY_TOKEN" });

      const db = getDb();
      if (!db.isRunning && !force) return NextResponse.json({ success: false, message: "Paused" });

      const client = new ApifyClient({ token: APIFY_TOKEN });
      let totalNewLeads = 0;

      for (const monitoredTag of db.monitoredTags) {
        try {
          console.log(`🕵️‍♂️ Checking #${monitoredTag}...`);

          const run = await client.actor("apify/instagram-hashtag-scraper").call({
              "hashtags": [monitoredTag],
              "resultsLimit": 20, 
              "resultsType": "posts", 
          });

          const { items } = await client.dataset(run.defaultDatasetId).listItems();

          if (items && items.length > 0) {
              const leads = items.map((item: any, index: number) => {
                   const username = item.ownerUsername || item.owner?.username || "Unknown";
                   const caption = item.caption || "";
                   const emailMatch = caption.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

                   // 🆕 CALCULATE AGE
                   const age = getTimeAgo(item.timestamp);

                   return {
                      id: `post-${item.id}`, 
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
                      // Save age in specific field for Discord, and in Notes for Dashboard
                      postAge: age, 
                      notes: `[${age}] "${caption.substring(0, 50)}..."`
                   };
              });

              const newLeadsFound = addLeadsToDb(leads);

              if (newLeadsFound.length > 0) {
                  console.log(`✅ Found ${newLeadsFound.length} NEW posts for #${monitoredTag}`);
                  if (DISCORD_WEBHOOK) await sendDiscordAlert(DISCORD_WEBHOOK, newLeadsFound);
              } else {
                  console.log(`zzz No new posts for #${monitoredTag}`);
              }

              totalNewLeads += newLeadsFound.length;
          }
        } catch (e: any) { 
            console.error(`❌ Error scanning #${monitoredTag}:`, e.message);
        }
      }

      return NextResponse.json({ success: true, newLeads: totalNewLeads });
    }

    return NextResponse.json({ error: "Invalid Action" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}