export type LeadStatus = "valid" | "risky" | "invalid" | "unknown";

export interface Lead {
  id: string;
  companyName: string;
  website: string;
  country: string;
  region: string;
  businessType: "Retailer" | "Wholesaler" | "Brand" | "Broker";
  contactName: string;
  contactRole: string;
  rawEmail?: string;
  domain: string;
  predictedEmail?: string;
  emailVerificationStatus: LeadStatus;
  score: number;
  notes?: string;
}

export interface SearchFilters {
  regions: string[];
  businessTypes: string[];
  keywords: string;
}

export interface OutreachLog {
  id: string;
  leadId: string;
  subject: string;
  body: string;
  sentAt: string;
  emailUsed: string;
}