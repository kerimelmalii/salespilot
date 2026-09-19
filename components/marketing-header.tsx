"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/#urun", label: "Ürün" },
  { href: "/#nasil-calisir", label: "Nasıl çalışır?" },
  { href: "/fiyatlandirma", label: "Fiyatlandırma" },
  { href: "/hakkimizda", label: "Hakkımızda" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="flex h-10 items-end gap-1 rounded-xl bg-blue-600 px-2.5 py-2 shadow-lg shadow-blue-600/20">
            <i className="h-2 w-1.5 rounded-sm bg-white/80"/><i className="h-4 w-1.5 rounded-sm bg-white/90"/><i className="h-6 w-1.5 rounded-sm bg-white"/>
          </span>
          SalesPilot
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">{links.map((link) => <Link key={link.href} href={link.href} className="transition hover:text-blue-600">{link.label}</Link>)}</nav>
        <div className="hidden items-center gap-2 lg:flex"><Link href="/giris?next=/panel" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Giriş yap</Link><Link href="/kayit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700">Ücretsiz başla</Link></div>
        <button onClick={() => setOpen(!open)} className="rounded-lg border border-slate-200 p-2 lg:hidden" aria-label="Menüyü aç">{open ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}</button>
      </div>
      {open ? <div className="absolute inset-x-0 top-20 border-b border-slate-200 bg-white p-5 shadow-xl lg:hidden"><nav className="space-y-1">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{link.label}</Link>)}</nav><div className="mt-4 grid grid-cols-2 gap-2"><Link href="/giris?next=/panel" className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold">Giriş yap</Link><Link href="/kayit" className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white">Ücretsiz başla</Link></div></div> : null}
    </header>
  );
}
