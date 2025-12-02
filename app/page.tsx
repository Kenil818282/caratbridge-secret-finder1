"use client";

import React, { useState } from "react";
import FilterPanel from "@/components/FilterPanel";
import LeadTable from "@/components/LeadTable";
import LeadDetailsSidebar from "@/components/LeadDetailsSidebar";
import { Lead } from "@/lib/types";
import { Diamond } from "lucide-react";

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);

  // 🧠 THE BRAIN: Handles Google, Instagram, and Watchtower Data
  const fetchLeads = async (filters: any) => {
    setLoading(true);
    setSelectedLead(null);

    // 🆕 WATCHTOWER LOGIC: If the Sidebar sends us "saved" data, we just display it.
    if (filters.mode === "watchtower_load") {
        setLeads(filters.leads || []);
        setLoading(false);
        return; 
    }

    // NORMAL SEARCH LOGIC (Google / Instagram)
    setLeads([]); // Clear old list so user knows something is happening

    try {
      let endpoint = "";
      const params = new URLSearchParams();

      // 1. DETERMINE ENGINE
      if (filters.mode === "instagram") {
          // 📸 INSTAGRAM ENGINE
          endpoint = "/api/instagram";
          params.append("hashtag", filters.hashtag);
      } else {
          // 🌍 GOOGLE SATELLITE ENGINE
          endpoint = "/api/leads";
          // Check for "Bulk Mode" (commas) or single search
          if (filters.keyword) params.append("keyword", filters.keyword);
          if (filters.city) params.append("city", filters.city);
          if (filters.country) params.append("country", filters.country);
      }

      // 2. FIRE THE REQUEST
      const res = await fetch(`${endpoint}?${params}`);
      const data = await res.json();

      // 3. HANDLE RESULTS
      if (data.error) {
          console.error("Search Error:", data.error);
          alert(`Search Failed: ${JSON.stringify(data.error)}`);
      } else {
          setLeads(data);
      }

    } catch (error) {
      console.error("Critical Failure:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-screen bg-white text-slate-900 font-sans overflow-hidden">

      {/* 📱 Mobile Top Bar (Hidden on Desktop) */}
      <div className="fixed top-0 left-0 w-full h-16 bg-white border-b border-slate-200 flex items-center px-6 z-20 md:hidden shadow-sm">
        <span className="text-slate-900 font-bold tracking-widest flex items-center gap-2">
            <Diamond className="w-5 h-5 fill-slate-900" /> CARATBRIDGE
        </span>
      </div>

      <div className="flex w-full h-full pt-16 md:pt-0">

        {/* 🎛️ LEFT SIDEBAR (Controls) */}
        <FilterPanel onSearch={fetchLeads} isLoading={loading} />

        {/* 📊 MAIN CONTENT (Table) */}
        <div className="flex-1 flex flex-col relative bg-slate-50">

          {/* Header */}
          <div className="h-20 bg-white border-b border-slate-200 flex items-center px-8 justify-between shadow-sm z-10">
             <h1 className="text-xl font-light tracking-widest flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 text-white rounded flex items-center justify-center shadow-lg">
                    <Diamond className="w-4 h-4" /> 
                </div>
                <span className="font-bold text-slate-900">CARATBRIDGE</span> 
                <span className="text-slate-400 font-light border-l border-slate-300 pl-3">
                    SECRET FINDER
                </span>
             </h1>
          </div>

          {/* Results Table */}
          <LeadTable leads={leads} onSelect={setSelectedLead} />

          {/* Slide-out Details Panel */}
          {selectedLead && (
            <LeadDetailsSidebar 
                lead={selectedLead} 
                onClose={() => setSelectedLead(null)} 
            />
          )}
        </div>
      </div>
    </main>
  );
}