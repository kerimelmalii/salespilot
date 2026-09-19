"use client";

import Link from "next/link";
import { Clock3, Search, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { readHistory, type SearchHistoryItem } from "@/lib/salespilot/workspace-storage";

export default function HistoryPage() {
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  useEffect(() => setItems(readHistory()), []);
  return <div><p className="eyebrow">Arşiv</p><h1 className="page-title">Geçmiş aramalar</h1><p className="page-description">Önceki hedeflemelerinizi ve sonuç sayılarını yeniden inceleyin.</p>
    <section className="surface-card mt-8 overflow-hidden">{items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <article key={item.id} className="grid gap-4 p-5 transition hover:bg-slate-50/70 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Search className="h-5 w-5"/></span><div><h2 className="font-semibold text-slate-800">{item.request.targetSector}</h2><p className="mt-1 text-sm text-slate-500">{item.request.targetRegion} · {item.request.productOrService}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5"/>{new Date(item.createdAt).toLocaleString("tr-TR")}</p></div></div><div className="flex gap-6 pl-15 sm:pl-0"><div><p className="font-semibold">{item.discovered}</p><p className="text-xs text-slate-400">aday</p></div><div><p className="font-semibold text-emerald-700">{item.qualified}</p><p className="text-xs text-slate-400">nitelikli</p></div></div></article>)}</div> : <div className="px-6 py-20 text-center"><Target className="mx-auto h-8 w-8 text-slate-300"/><h2 className="mt-4 font-semibold">Henüz kayıtlı arama yok</h2><p className="mt-2 text-sm text-slate-400">Tamamlanan taramalar otomatik olarak burada saklanır.</p><Link href="/panel/yeni-arama" className="primary-button mt-6 inline-flex">İlk aramayı başlat</Link></div>}</section>
  </div>;
}
