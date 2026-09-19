"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bookmark, History, LogOut, Search, Settings, Sparkles, UserRound } from "lucide-react";
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
      <Link key={href} href={href} className={`sidebar-nav-link ${active ? "sidebar-nav-link-active" : ""}`}>
        <Icon className="h-4 w-4" strokeWidth={active ? 2.2 : 1.8} />{label}
      </Link>
    );
  });

  async function logout() {
    await fetch("/api/cikis", { method: "POST" });
    window.location.assign("/");
  }

  const sidebar = (
    <div className="sidebar-shell">
      <div className="sidebar-brand">
        <Link href="/panel" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-950 text-xs text-white shadow-sm shadow-blue-950/20">SP</span><span>SalesPilot</span></Link>
      </div>
      <Link href="/panel/yeni-arama" className="uniform-action-button sidebar-primary-action"><Sparkles className="h-4 w-4" />Yeni tarama başlat</Link>

      <div className="sidebar-section">
        <p className="sidebar-section-label">Çalışma alanı</p>
        <nav className="sidebar-nav-list">{nav(navigation)}</nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-section sidebar-account-section">
          <p className="sidebar-section-label">Hesap</p>
          <nav className="sidebar-nav-list">{nav(accountNavigation)}</nav>
          <button type="button" onClick={logout} className="sidebar-nav-link sidebar-logout"><LogOut className="h-4 w-4"/>Çıkış yap</button>
        </div>
        <Link href="/panel/profil" className="sidebar-profile-card">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">{profileName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{profileName}</span><span className="block text-xs text-slate-400">Pilot çalışma alanı</span></span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f9fd] text-slate-950">
      <aside className="app-sidebar-desktop fixed inset-y-0 left-0 z-30">{sidebar}</aside>
      <div className="app-main-content">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-[#f7f9fd]/90 px-5 backdrop-blur lg:px-8">
          <p className="text-xs font-medium text-slate-400">Alıcı zekâsı çalışma alanı</p>
          <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-500"/>Sistem hazır</div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8 lg:py-9">{children}</div>
      </div>
    </div>
  );
}
