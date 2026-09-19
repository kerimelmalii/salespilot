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
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
      <div className="marketing-header-row mx-auto max-w-7xl px-5 lg:px-8">
        <Link href="/" className="flex w-fit items-center gap-3 justify-self-start text-lg font-semibold tracking-tight text-slate-950">
          <span className="flex h-10 items-end gap-1 rounded-xl bg-blue-600 px-2.5 py-2 shadow-lg shadow-blue-600/20">
            <i className="h-2 w-1.5 rounded-sm bg-white/80" />
            <i className="h-4 w-1.5 rounded-sm bg-white/90" />
            <i className="h-6 w-1.5 rounded-sm bg-white" />
          </span>
          SalesPilot
        </Link>

        <nav aria-label="Ana menü" className="marketing-desktop-nav whitespace-nowrap text-sm font-medium text-slate-600">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-blue-600">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="marketing-desktop-actions items-center justify-end gap-2">
          <Link href="/giris?next=/panel" className="marketing-login-button text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
            Giriş yap
          </Link>
          <Link href="/kayit?plan=demo" className="marketing-cta-button bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition-colors hover:bg-blue-700">
            Ücretsiz başla
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="marketing-mobile-toggle justify-self-end rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm"
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-[72px] border-b border-slate-200 bg-white px-5 pb-6 pt-3 shadow-xl shadow-slate-900/5 lg:hidden">
          <nav aria-label="Mobil menü" className="mx-auto max-w-7xl space-y-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto mt-4 grid max-w-7xl grid-cols-2 gap-2 border-t border-slate-100 pt-4">
            <Link href="/giris?next=/panel" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">
              Giriş yap
            </Link>
            <Link href="/kayit?plan=demo" onClick={() => setOpen(false)} className="rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white">
              Ücretsiz başla
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
