import { NextResponse } from "next/server";
import { Lead } from "@/lib/types";
import { getApiKeys } from "@/lib/config"; // 👈 Import Config

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const keywordParam = searchParams.get("keyword") || "Jewelry";
  const cityParam = searchParams.get("city") || "Local";
  const country = searchParams.get("country") || ""; 

  // Split inputs for Bulk Search
  const keywords = keywordParam.split(",").map(k => k.trim()).filter(k => k.length > 0);
  const cities = cityParam.split(",").map(c => c.trim()).filter(c => c.length > 0);

  // 🔒 GET KEY FROM SETTINGS
  const { SERPAPI_KEY } = getApiKeys();
  const API_KEY = SERPAPI_KEY;

  if (!API_KEY) {
      return NextResponse.json([createErrorLead("MISSING KEY", "Go to Settings (Gear Icon) and paste your SerpApi Key.")]);
  }

  try {
    let allLeads: Lead[] = [];
    const MAX_PAGES_PER_TERM = 2; // Safety limit

    // 🔄 BULK SEARCH LOOP
    for (const city of cities) {
        for (const term of keywords) {

            const searchQuery = `${term} in ${city} ${country}`.trim();
            console.log(`📡 SEARCHING: "${term}" in ${city}...`);

            let nextUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(searchQuery)}&api_key=${API_KEY}&type=search`;

            for (let page = 0; page < MAX_PAGES_PER_TERM; page++) {

                if (!nextUrl) break;

                const res = await fetch(nextUrl);
                const data = await res.json();

                if (data.error) {
                    console.log(`❌ Skipped "${term}" error:`, data.error);
                    break;
                }
                if (!data.local_results || data.local_results.length === 0) break;

                const pageLeads = data.local_results.map((result: any, index: number) => {
                    let domain = "google.com";
                    let generatedEmail = undefined;

                    if (result.website) {
                        try { 
                            const urlObj = new URL(result.website);
                            domain = urlObj.hostname.replace("www.", "");
                            generatedEmail = `info@${domain}`;
                        } catch (e) {}
                    }

                    return {
                        id: `lead-${city}-${term}-${index}-${Math.random()}`,
                        companyName: result.title,
                        website: result.website || "#",
                        country: country || "Local",
                        region: city,
                        businessType: term,
                        contactName: "Store Manager",
                        contactRole: "Owner",
                        rawEmail: undefined,
                        predictedEmail: generatedEmail,
                        domain: domain,
                        emailVerificationStatus: generatedEmail ? "risky" : "unknown",
                        score: result.rating ? Math.round(result.rating * 20) : 60,
                        notes: result.phone || "No Phone" 
                    };
                });

                allLeads = [...allLeads, ...pageLeads];

                if (data.serpapi_pagination && data.serpapi_pagination.next) {
                    nextUrl = `${data.serpapi_pagination.next}&api_key=${API_KEY}`;
                } else {
                    nextUrl = ""; 
                }
            }
        }
    }

    // Remove duplicates
    const uniqueLeads = Array.from(new Map(allLeads.map(item => [item.companyName, item])).values());
    return NextResponse.json(uniqueLeads);

  } catch (error: any) {
    console.error("Bulk Search Failed:", error);
    return NextResponse.json([createErrorLead("SYSTEM FAIL", error.message)]);
  }
}

function createErrorLead(title: string, msg: string): Lead {
    return {
        id: "error", companyName: `⚠️ ${title}`, notes: "Error", 
        businessType: "Error" as any, country: "Error", region: "Error", 
        contactName: "System", contactRole: "Admin", website: "#", 
        domain: msg, score: 0, emailVerificationStatus: "invalid"
    };
}