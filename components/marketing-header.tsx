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
      <div className="mx-auto grid h-[72px] max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-5 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link href="/" className="flex w-fit items-center gap-2.5 text-[17px] font-semibold tracking-[-0.02em] text-slate-950">
          <span className="flex h-9 w-9 items-end justify-center gap-[3px] rounded-[10px] bg-blue-600 px-2 py-1.5 shadow-sm shadow-blue-600/25">
            <i className="h-2 w-1 rounded-[2px] bg-white/75" />
            <i className="h-3.5 w-1 rounded-[2px] bg-white/90" />
            <i className="h-5 w-1 rounded-[2px] bg-white" />
          </span>
          SalesPilot
        </Link>

        <nav aria-label="Ana menü" className="hidden items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1 text-sm font-medium text-slate-600 shadow-sm lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3.5 py-2 transition-colors hover:bg-white hover:text-blue-700 hover:shadow-sm">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-2 lg:flex">
          <Link href="/giris?next=/panel" className="rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950">
            Giriş yap
          </Link>
          <Link href="/kayit?plan=demo" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-colors hover:bg-blue-700">
            Ücretsiz başla
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="justify-self-end rounded-lg border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm lg:hidden"
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
