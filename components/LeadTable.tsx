import React from "react";
import { Lead } from "@/lib/types";
import { CheckCircle, AlertTriangle, HelpCircle, ArrowRight, Download, Phone, Globe, Mail } from "lucide-react";

interface Props {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
}

export default function LeadTable({ leads, onSelect }: Props) {

  // ⚡️ PROFESSIONAL CSV EXPORT ENGINE
  const downloadCSV = () => {
    if (!leads || leads.length === 0) return;

    // 1. Define Columns
    const headers = ["Company", "Phone", "Website", "Email (Predicted)", "Score", "City/Region"];

    // 2. Helper to clean data (Fixes the "Broken Row" bug)
    // We wrap every field in quotes "..." so commas inside names don't break Excel.
    const clean = (text: any) => {
        if (!text) return '""';
        return `"${String(text).replace(/"/g, '""')}"`; 
    };

    // 3. Build the CSV content row by row
    const csvContent = [
        headers.join(","), // Header Row
        ...leads.map(l => [
            clean(l.companyName),
            clean(l.notes || "N/A"), // Phone
            clean(l.website),
            clean(l.rawEmail || l.predictedEmail),
            clean(l.score),
            clean(l.region)
        ].join(","))
    ].join("\n");

    // 4. Create a "Blob" (Safe File Object)
    // The "\ufeff" at the start tells Excel: "This file has Japanese/Arabic text"
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // 5. Trigger Download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `caratbridge_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Empty State
  if (leads.length === 0) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
            <p className="font-medium text-sm">Ready to scan...</p>
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

      {/* Toolbar */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-2">
            <span className="text-slate-900 font-bold text-sm">Found {leads.length} Active Leads</span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                Bulk Mode Active
            </span>
        </div>
        <button 
            onClick={downloadCSV} 
            className="flex items-center gap-2 text-xs font-bold text-white bg-slate-900 border border-slate-900 px-4 py-2 rounded hover:bg-slate-800 transition-colors shadow-md"
        >
            <Download className="w-4 h-4" /> Export Excel (Safe)
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 tracking-wider">
                <tr>
                    <th className="px-5 py-4 w-20 text-center">Score</th>
                    <th className="px-5 py-4">Company Details</th>
                    <th className="px-5 py-4">Contact Info</th>
                    <th className="px-5 py-4">Predicted Email</th>
                    <th className="px-5 py-4 w-16"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                <tr 
                    key={lead.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors group" 
                    onClick={() => onSelect(lead)}
                >
                    {/* Score */}
                    <td className="px-5 py-4 text-center">
                        <span className={`inline-block w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            lead.score > 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                            {lead.score}
                        </span>
                    </td>

                    {/* Company */}
                    <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-base">{lead.companyName}</div>
                        <div className="flex items-center gap-3 mt-1">
                            <a 
                                href={lead.website} 
                                target="_blank" 
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                               <Globe className="w-3 h-3" /> {lead.domain}
                            </a>
                            <span className="text-[10px] text-slate-400 uppercase border-l border-slate-200 pl-3">
                                {lead.region}
                            </span>
                        </div>
                    </td>

                    {/* Phone */}
                    <td className="px-5 py-4">
                        {lead.notes && lead.notes !== "No Phone" ? (
                            <div className="flex items-center gap-2 text-slate-700 font-mono text-xs">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {lead.notes}
                            </div>
                        ) : (
                            <span className="text-slate-300 text-xs italic">No direct line</span>
                        )}
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 border border-slate-200 font-mono">
                                {lead.predictedEmail}
                            </span>
                        </div>
                    </td>

                    {/* Action Arrow */}
                    <td className="px-5 py-4 text-right">
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}