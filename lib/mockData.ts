import { Lead } from "./types";

// --- 1. MOCK DATASET (50+ Leads) ---
const FIRST_NAMES = ["James", "Sarah", "David", "Emma", "Michael", "Sophie", "Wei", "Ahmed", "Elena", "Robert"];
const LAST_NAMES = ["Smith", "Gold", "Chen", "Dubois", "Patel", "Muller", "Rossi", "Tanaka", "Ivanov", "Jones"];
const COMPANIES = ["Regal Gems", "Blue Horizon", "Eternal Carats", "Luxe stones", "Aurum NYC", "Antwerp Direct", "Dubai Gold Souk Traders", "Tokyo Sparkle", "Paris Joaillerie", "Sydney Diamonds"];
const DOMAINS = ["regalgems.com", "bluehorizon.co.uk", "eternalcarats.us", "luxestones.fr", "aurum-nyc.com", "antwerp-direct.be", "dubai-traders.ae", "tokyosparkle.jp", "paris-joaillerie.fr", "sydneydiamonds.com.au"];

function generateMockLeads(count: number): Lead[] {
  return Array.from({ length: count }).map((_, i) => {
    const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const companyBase = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
    const domainBase = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
    const hasRawEmail = Math.random() > 0.5;

    // Derived Domain
    const domain = domainBase; 

    return {
      id: `lead-${i + 100}`,
      companyName: `${companyBase} ${Math.floor(Math.random() * 99)}`,
      website: `https://www.${domain}`,
      country: ["USA", "UK", "France", "UAE", "Japan", "Australia", "India", "Germany"][Math.floor(Math.random() * 8)],
      region: ["North America", "Europe", "Middle East", "Asia", "Oceania"][Math.floor(Math.random() * 5)],
      businessType: ["Retailer", "Wholesaler", "Brand", "Broker"][Math.floor(Math.random() * 4)] as any,
      contactName: `${fn} ${ln}`,
      contactRole: ["Buyer", "Director", "Procurement Head", "Owner"][Math.floor(Math.random() * 4)],
      rawEmail: hasRawEmail ? `${fn.toLowerCase()}@${domain}` : undefined,
      domain: domain,
      emailVerificationStatus: "unknown", // Calculated later
      score: 0, // Calculated later
    };
  });
}

const db_leads = generateMockLeads(60);

// --- 2. LOGIC: EMAIL PREDICTION ---
export function predictEmail(contactName: string, domain: string): string {
  const parts = contactName.toLowerCase().split(" ");
  if (parts.length < 2) return `info@${domain}`;

  // Strategy: firstname.lastname@domain (Most common corporate pattern)
  return `${parts[0]}.${parts[1]}@${domain}`;
}

// --- 3. LOGIC: DUMMY VERIFICATION ---
export function mockVerifyEmail(email: string): "valid" | "risky" | "invalid" {
  // Deterministic mock verification based on string length to keep it consistent
  const len = email.length;
  if (len % 7 === 0) return "invalid";
  if (len % 5 === 0) return "risky";
  return "valid";
}

// --- 4. LOGIC: LEAD SCORING ---
export function calculateLeadScore(lead: Lead, keywords: string): number {
  let score = 0;

  // Region Weight
  if (["USA", "UK", "UAE"].includes(lead.country)) score += 25;
  else if (["France", "Germany", "Australia"].includes(lead.country)) score += 20;
  else score += 10;

  // Business Type Weight
  if (lead.businessType === "Wholesaler") score += 25;
  if (lead.businessType === "Brand") score += 20;
  if (lead.businessType === "Retailer") score += 15;

  // Data Completeness
  if (lead.rawEmail) score += 20;
  else if (lead.predictedEmail) score += 10;

  // Keyword Match (Simple check against company name for demo)
  if (keywords && lead.companyName.toLowerCase().includes(keywords.toLowerCase())) {
    score += 15;
  }

  return Math.min(score, 100);
}

// Export the "database"
export const MOCK_DB = db_leads;