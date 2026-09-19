"use client";

import { Bookmark, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { readSavedLeads, toggleSavedLead, type SavedLead } from "@/lib/salespilot/workspace-storage";

export default function SavedLeadsPage() {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const sync = () => setLeads(readSavedLeads());
  useEffect(sync, []);

  function removeLead(lead: SavedLead) {
    toggleSavedLead({ title: lead.title, domain: lead.domain, url: lead.url, snippet: "", discoveryConfidence: "high", discoveryReason: "Kaydedilen lead", foundVia: [] });
    sync();
  }

  return (
    <div>
      <p className="eyebrow">Takip listesi</p>
      <h1 className="page-title">Kaydedilen lead&apos;ler</h1>
      <p className="page-description">İlgilendiğiniz şirketleri daha sonra değerlendirmek üzere burada tutun.</p>
      <section className="surface-card mt-8 overflow-hidden">
        {leads.length ? (
          <div className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <article key={lead.domain} className="flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 font-semibold text-blue-800">{lead.title.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><h2 className="truncate font-semibold text-slate-800">{lead.title}</h2><p className="mt-1 truncate text-xs text-slate-400">{lead.domain} · {lead.sector || "Sektör belirtilmedi"}</p></div>
                {lead.score !== undefined ? <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{lead.score}</span> : null}
                <a href={lead.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Web sitesini aç"><ExternalLink className="h-4 w-4" /></a>
                <button onClick={() => removeLead(lead)} className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600" aria-label="Kayıttan kaldır"><Trash2 className="h-4 w-4" /></button>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-20 text-center"><Bookmark className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-4 font-semibold">Takip listeniz boş</h2><p className="mt-2 text-sm text-slate-400">Arama sonuçlarından kaydettiğiniz şirketler burada görünür.</p></div>
        )}
      </section>
    </div>
  );
}
