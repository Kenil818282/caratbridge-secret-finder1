import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { getDb, saveDb, addLeadsToDb, addTag, removeTag, setRunningStatus } from "@/lib/db";
import { getApiKeys } from "@/lib/config";

export const runtime = 'nodejs'; 
export const maxDuration = 60; 

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
                        title: `💎 Fresh Post: @${lead.companyName}`,
                        url: lead.website,
                        color: 3066993,
                        fields: [
                            { name: "Time", value: lead.postAge, inline: true },
                            { name: "Source", value: lead.businessType, inline: true },
                            { name: "Caption", value: lead.notes || "-" }
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
    const { action, tag, force, limit } = body;

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

      // 1. FORCE LOAD TAGS FROM ENV
      let tagsToScan = [];

      // 🔍 DEBUG: Read Raw Env Var
      const rawEnvTags = process.env.WATCH_TAGS; 

      if (rawEnvTags) {
          tagsToScan = rawEnvTags.split(',').map(t => t.trim());
      } else if (db.monitoredTags && db.monitoredTags.length > 0) {
          tagsToScan = db.monitoredTags;
      }

      if (tagsToScan.length === 0) {
          return NextResponse.json({ 
              success: false, 
              message: "No tags found.",
              debugEnv: rawEnvTags || "WATCH_TAGS is empty on Render" // 👈 TELLS YOU THE TRUTH
          });
      }

      const client = new ApifyClient({ token: APIFY_TOKEN });
      let totalNewLeads = 0;
      const scanLimit = limit || 20;

      for (const monitoredTag of tagsToScan) {
        try {
          console.log(`🕵️‍♂️ Checking #${monitoredTag}...`);

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

                   // 🚫 FILTER: STRICT 48 HOURS
                   if (diffHours > 48) return null;

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
                  if (DISCORD_WEBHOOK) await sendDiscordAlert(DISCORD_WEBHOOK, newLeadsFound);
              }
              totalNewLeads += newLeadsFound.length;
          }
        } catch (e: any) { console.error(`Error #${monitoredTag}:`, e.message); }
      }

      return NextResponse.json({ 
          success: true, 
          debugEnvTags: rawEnvTags, // 👈 SHOWS YOU WHAT RENDER SEES
          scannedCount: tagsToScan.length,
          newLeads: totalNewLeads 
      });
    }

    return NextResponse.json({ error: "Invalid Action" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}