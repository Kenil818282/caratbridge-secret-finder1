                                                                                           import React, { useState } from "react";
                                                                                           import { Lead } from "@/lib/types";
                                                                                           import { X, Send, Globe, User, Building, Mail } from "lucide-react";

                                                                                           interface Props {
                                                                                             lead: Lead | null;
                                                                                             onClose: () => void;
                                                                                           }

                                                                                           export default function LeadDetailsSidebar({ lead, onClose }: Props) {
                                                                                             const [subject, setSubject] = useState("");
                                                                                             const [isSending, setIsSending] = useState(false);
                                                                                             const [log, setLog] = useState<any[]>([]);

                                                                                             React.useEffect(() => {
                                                                                               if (lead) setSubject(`Partnership Opportunity: ${lead.companyName} x CaratBridge`);
                                                                                             }, [lead]);

                                                                                             const handleSend = async () => {
                                                                                               if (!lead) return;
                                                                                               setIsSending(true);
                                                                                               await fetch('/api/outreach', {
                                                                                                 method: 'POST',
                                                                                                 body: JSON.stringify({
                                                                                                   leadId: lead.id,
                                                                                                   subject,
                                                                                                   emailUsed: lead.rawEmail || lead.predictedEmail,
                                                                                                   body: "Simulated content..." 
                                                                                                 })
                                                                                               });
                                                                                               setTimeout(() => {
                                                                                                 setIsSending(false);
                                                                                                 setLog(prev => [{ subject, time: new Date().toLocaleTimeString(), status: "Sent" }, ...prev]);
                                                                                               }, 1000);
                                                                                             };

                                                                                             if (!lead) return null;
                                                                                             const email = lead.rawEmail || lead.predictedEmail;

                                                                                             return (
                                                                                               <div className="absolute top-0 right-0 h-full w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-slide-in">
                                                                                                 {/* Header */}
                                                                                                 <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                                                                                                   <div>
                                                                                                     <div className="inline-flex items-center gap-2 mb-2 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                                                        <Building className="w-3 h-3" /> {lead.businessType}
                                                                                                     </div>
                                                                                                     <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">{lead.companyName}</h2>
                                                                                                     <a href={lead.website} target="_blank" className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium">
                                                                                                        <Globe className="w-3 h-3" /> {lead.domain}
                                                                                                     </a>
                                                                                                   </div>
                                                                                                   <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors p-1 bg-white hover:bg-slate-200 rounded-full">
                                                                                                     <X className="w-5 h-5" />
                                                                                                   </button>
                                                                                                 </div>

                                                                                                 <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">

                                                                                                   {/* Verification Card */}
                                                                                                   <div className={`p-5 rounded-xl border ${lead.emailVerificationStatus === 'valid' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                                                                                     <div className="flex items-center justify-between mb-2">
                                                                                                       <span className={`text-xs font-bold uppercase tracking-wider ${lead.emailVerificationStatus === 'valid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                                                                           Target Email
                                                                                                       </span>
                                                                                                       <span className={`text-xs px-2 py-0.5 rounded-full bg-white border font-bold ${lead.emailVerificationStatus === 'valid' ? 'text-emerald-700 border-emerald-200' : 'text-amber-700 border-amber-200'}`}>
                                                                                                           {lead.emailVerificationStatus.toUpperCase()}
                                                                                                       </span>
                                                                                                     </div>
                                                                                                     <div className="flex items-center gap-3">
                                                                                                         <Mail className={`w-5 h-5 ${lead.emailVerificationStatus === 'valid' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                                                                                         <p className="text-lg text-slate-900 font-mono font-medium">{email}</p>
                                                                                                     </div>
                                                                                                     {!lead.rawEmail && <p className="text-xs text-slate-500 mt-2 pl-8">Pattern-predicted. Please verify.</p>}
                                                                                                   </div>

                                                                                                   {/* Contact Info */}
                                                                                                   <div className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                                                                                                       <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                                                                                                           <User className="w-6 h-6" />
                                                                                                       </div>
                                                                                                       <div>
                                                                                                           <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Decision Maker</p>
                                                                                                           <p className="text-slate-900 font-bold text-lg">{lead.contactName}</p>
                                                                                                           <p className="text-sm text-slate-500">{lead.contactRole}</p>
                                                                                                       </div>
                                                                                                   </div>

                                                                                                   {/* Simulator */}
                                                                                                   <div className="bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 p-6">
                                                                                                       <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
                                                                                                           <Send className="w-4 h-4 text-amber-600" /> Outreach Simulator
                                                                                                       </h3>

                                                                                                       <div className="space-y-4">
                                                                                                           <div>
                                                                                                               <label className="text-xs font-semibold text-slate-500 block mb-1.5">Subject Line</label>
                                                                                                               <input 
                                                                                                                   value={subject} 
                                                                                                                   onChange={e => setSubject(e.target.value)}
                                                                                                                   className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition" 
                                                                                                               />
                                                                                                           </div>
                                                                                                           <div>
                                                                                                               <label className="text-xs font-semibold text-slate-500 block mb-1.5">Email Preview</label>
                                                                                                               <div className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 font-serif leading-relaxed overflow-auto">
                                                                                                                   Dear {lead.contactName.split(' ')[0]},<br/><br/>
                                                                                                                   I hope this email finds you well. I came across {lead.companyName} and was impressed by your presence in the {lead.country} market.<br/><br/>
                                                                                                                   At CaratBridge, we specialize in direct sourcing...
                                                                                                               </div>
                                                                                                           </div>
                                                                                                           <button 
                                                                                                               onClick={handleSend}
                                                                                                               disabled={isSending}
                                                                                                               className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 rounded-lg transition-all shadow-md active:scale-[0.98]"
                                                                                                           >
                                                                                                               {isSending ? "Simulating Send..." : "Simulate Outreach"}
                                                                                                           </button>
                                                                                                       </div>
                                                                                                   </div>

                                                                                                   {/* Logs */}
                                                                                                   {log.length > 0 && (
                                                                                                       <div className="pt-4 border-t border-slate-100">
                                                                                                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Recent Activity</h3>
                                                                                                            <div className="space-y-2">
                                                                                                               {log.map((l, i) => (
                                                                                                                   <div key={i} className="text-xs bg-white p-3 rounded-lg text-slate-500 border border-slate-200 shadow-sm flex justify-between items-center">
                                                                                                                       <span className="font-medium text-slate-900 truncate max-w-[200px]">{l.subject}</span>
                                                                                                                       <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold text-[10px]">{l.status}</span>
                                                                                                                   </div>
                                                                                                               ))}
                                                                                                            </div>
                                                                                                       </div>
                                                                                                   )}

                                                                                                 </div>
                                                                                               </div>
                                                                                             );
                                                                                           }