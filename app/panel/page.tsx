"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Building2, History, Search, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { readHistory, readSavedLeads, type SearchHistoryItem } from "@/lib/salespilot/workspace-storage";

export default function PanelPage() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const sync = () => { setHistory(readHistory()); setSavedCount(readSavedLeads().length); };
    sync();
    window.addEventListener("salespilot:storage", sync);
    return () => window.removeEventListener("salespilot:storage", sync);
  }, []);

  const discovered = history.reduce((sum, item) => sum + item.discovered, 0);
  const qualified = history.reduce((sum, item) => sum + item.qualified, 0);
  const cards = [
    { label: "Toplam tarama", value: history.length, icon: History, note: "Kayıtlı arama" },
    { label: "Bulunan şirket", value: discovered, icon: Building2, note: "Ön elemeden geçen" },
    { label: "Nitelikli lead", value: qualified, icon: Target, note: "Doğrulanmış eşleşme" },
    { label: "Kaydedilenler", value: savedCount, icon: Bookmark, note: "Takip listenizde" },
  ];

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="eyebrow">Genel bakış</p><h1 className="page-title">Satış çalışma alanınız</h1><p className="page-description">Aramalarınızı, nitelikli şirketleri ve takip listenizi tek yerden yönetin.</p></div>
        <Link href="/panel/yeni-arama" className="primary-button inline-flex items-center justify-center gap-2"><Sparkles className="h-4 w-4"/>Yeni tarama</Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, note }) => <article key={label} className="surface-card p-5"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="h-5 w-5"/></span><span className="text-xs text-slate-400">Tüm zamanlar</span></div><p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm font-medium text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>)}</section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
        <section className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold">Son aramalar</h2><p className="mt-1 text-xs text-slate-400">En son oluşturduğunuz hedef listeleri</p></div><Link href="/panel/gecmis" className="text-sm font-semibold text-emerald-800">Tümünü gör</Link></div>
          {history.length ? <div className="divide-y divide-slate-100">{history.slice(0, 5).map((item) => <div key={item.id} className="flex items-center gap-4 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Search className="h-4 w-4 text-slate-500"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{item.request.targetSector || "İsimsiz arama"}</p><p className="mt-1 text-xs text-slate-400">{item.request.targetRegion} · {new Date(item.createdAt).toLocaleDateString("tr-TR")}</p></div><div className="text-right"><p className="text-sm font-semibold">{item.discovered}</p><p className="text-xs text-slate-400">aday</p></div></div>)}</div> : <EmptyState />}
        </section>
        <section className="rounded-2xl bg-emerald-950 p-6 text-white shadow-xl shadow-emerald-950/10"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Sparkles className="h-5 w-5 text-emerald-200"/></span><h2 className="mt-12 text-2xl font-semibold tracking-tight">İlk hedef listenizi oluşturun.</h2><p className="mt-3 text-sm leading-6 text-emerald-100/70">Sektör ve bölgeyi tanımlayın. SalesPilot gerçek alıcıları bulup kanıtlarıyla birlikte puanlasın.</p><Link href="/panel/yeni-arama" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-950">Aramaya başla <ArrowRight className="h-4 w-4"/></Link></section>
      </div>
    </div>
  );
}

function EmptyState() {
  return <div className="px-6 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100"><Search className="h-5 w-5 text-slate-400"/></span><p className="mt-4 text-sm font-semibold text-slate-700">Henüz arama yok</p><p className="mt-1 text-xs text-slate-400">İlk taramanız burada görünecek.</p></div>;
}
