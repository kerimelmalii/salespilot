"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bookmark, History, LogOut, Menu, Search, Settings, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { readProfile } from "@/lib/salespilot/workspace-storage";

const navigation = [
  { href: "/panel", label: "Genel bakış", icon: BarChart3 },
  { href: "/panel/yeni-arama", label: "Yeni arama", icon: Search },
  { href: "/panel/gecmis", label: "Geçmiş aramalar", icon: History },
  { href: "/panel/kaydedilenler", label: "Kaydedilen lead'ler", icon: Bookmark },
];

const accountNavigation = [
  { href: "/panel/profil", label: "Profil", icon: UserRound },
  { href: "/panel/ayarlar", label: "Ayarlar", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileName, setProfileName] = useState("SalesPilot Kullanıcısı");

  useEffect(() => {
    const sync = () => setProfileName(readProfile().fullName);
    sync();
    window.addEventListener("salespilot:storage", sync);
    return () => window.removeEventListener("salespilot:storage", sync);
  }, []);

  const nav = (items: typeof navigation) => items.map(({ href, label, icon: Icon }) => {
    const active = pathname === href;
    return (
      <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-blue-50 text-blue-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
        <Icon className="h-4 w-4" strokeWidth={active ? 2.2 : 1.8} />{label}
      </Link>
    );
  });

  async function logout() {
    await fetch("/api/cikis", { method: "POST" });
    window.location.assign("/");
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-20 items-center justify-between px-5">
        <Link href="/panel" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-950 text-xs text-white">SP</span>SalesPilot</Link>
        <button className="app-mobile-only" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat"><X className="h-5 w-5" /></button>
      </div>
      <div className="px-3"><Link href="/panel/yeni-arama" className="flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5"><Sparkles className="h-4 w-4" />Yeni tarama başlat</Link></div>
      <nav className="mt-6 space-y-1 px-3">{nav(navigation)}</nav>
      <div className="mt-auto border-t border-slate-100 p-3">
        <nav className="space-y-1">{nav(accountNavigation)}</nav>
        <button type="button" onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4"/>Çıkış yap</button>
        <Link href="/panel/profil" className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">{profileName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{profileName}</span><span className="block text-xs text-slate-400">Pilot çalışma alanı</span></span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-slate-950">
      <aside className="app-sidebar-desktop fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200">{sidebar}</aside>
      {mobileOpen ? <div className="app-mobile-overlay fixed inset-0 z-40"><button className="absolute inset-0 bg-slate-950/35" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat"/><aside className="relative h-full w-72 shadow-2xl">{sidebar}</aside></div> : null}
      <div className="app-main-content">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-[#f7f9fd]/90 px-5 backdrop-blur lg:px-8">
          <button onClick={() => setMobileOpen(true)} className="app-mobile-only rounded-lg border border-slate-200 bg-white p-2" aria-label="Menüyü aç"><Menu className="h-5 w-5" /></button>
          <p className="app-desktop-only text-xs font-medium text-slate-400">Alıcı zekâsı çalışma alanı</p>
          <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-500"/>Sistem hazır</div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8 lg:py-9">{children}</div>
      </div>
    </div>
  );
}
