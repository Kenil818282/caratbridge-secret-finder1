import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { getDb, saveDb, addLeadsToDb, addTag, removeTag, setRunningStatus } from "@/lib/db";
import { getApiKeys } from "@/lib/config";

export const runtime = 'nodejs'; 
export const maxDuration = 60; 

// HELPER: Time Ago String
function getTimeAgo(isoDate: string) {
    if (!isoDate) return "Unknown";
    const created = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime(); 
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// 🔔 DISCORD SENDER
async function sendDiscordAlert(webhookUrl: string, leads: any[]) {
    if (!webhookUrl || leads.length === 0) return;

    // Send in batches to avoid spamming Discord API too fast
    const batchSize = 10;
    for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        for (const lead of batch) {
            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: "CaratBridge Daily Report",
                        embeds: [{
                            title: `💎 Daily Catch: @${lead.companyName}`,
                            url: lead.website,
                            color: 3066993,
                            fields: [
                                { name: "Posted", value: lead.postAge, inline: true },
                                { name: "Source", value: lead.businessType, inline: true },
                                { name: "Caption", value: lead.notes ? lead.notes.substring(0, 100) : "-" }
                            ],
                            footer: { text: "CaratBridge Secret Finder" },
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
                // Small pause to be nice to Discord
                await new Promise(r => setTimeout(r, 500)); 
            } catch (e) { console.error("Discord Error", e); }
        }
    }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, tag, force, limit } = body; // 👈 NOW READING 'limit'

    // --- ACTIONS ---
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
      // If we are forcing a Daily Scan, ignore the "Running" switch
      if (!db.isRunning && !force) return NextResponse.json({ success: false, message: "Paused" });

      const client = new ApifyClient({ token: APIFY_TOKEN });
      let totalNewLeads = 0;

      // Default to 50 if it's a Daily Scan (force=true), otherwise 20
      const scanLimit = limit || (force ? 50 : 20); 

      for (const monitoredTag of db.monitoredTags) {
        try {
          console.log(`🕵️‍♂️ Daily Scan: #${monitoredTag} (Fetching ${scanLimit} posts)...`);

          const run = await client.actor("apify/instagram-hashtag-scraper").call({
              "hashtags": [monitoredTag],
              "resultsLimit": scanLimit, 
              "resultsType": "posts", 
          });

          const { items } = await client.dataset(run.defaultDatasetId).listItems();

          // SORT NEWEST FIRST
          items.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          if (items && items.length > 0) {
              const leads = items.map((item: any) => {
                   const created = new Date(item.timestamp);
                   const now = new Date();
                   const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

                   // 🚫 REJECT if older than 24 Hours (Since we run daily)
                   // You can change this to 48 if you want a buffer
                   if (diffHours > 26) return null; 

                   const username = item.ownerUsername || item.owner?.username || "Unknown";
                   const caption = item.caption || "";
                   const emailMatch = caption.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
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
                      postAge: age,
                      notes: `[${age}] "${caption.substring(0, 50)}..."`
                   };
              }).filter(item => item !== null);

              const newLeadsFound = addLeadsToDb(leads);

              if (newLeadsFound.length > 0) {
                  console.log(`✅ Found ${newLeadsFound.length} FRESH posts for #${monitoredTag}`);
                  if (DISCORD_WEBHOOK) await sendDiscordAlert(DISCORD_WEBHOOK, newLeadsFound);
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