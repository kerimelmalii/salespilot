"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const slides = [
  { src: "/showcase/customer-search.webp", alt: "SalesPilot müşteri arama sürecini otomatikleştirir", label: "Manuel araştırmayı geride bırakın" },
  { src: "/showcase/company-analysis.webp", alt: "SalesPilot şirket analiz ekranı", label: "Her şirketi çoklu kaynaklarla analiz edin" },
  { src: "/showcase/sales-workflow.webp", alt: "SalesPilot akıllı satış iş akışı", label: "Taramadan iletişime tek akış" },
];

export function ProductCarousel() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, []);
  const move = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length);

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_35px_90px_-45px_rgba(20,86,220,.5)]">
        <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${active * 100}%)` }}>
          {slides.map((slide, index) => <div key={slide.src} className="min-w-full"><Image src={slide.src} alt={slide.alt} width={1250} height={1250} sizes="(max-width: 1024px) 92vw, 960px" className="h-auto w-full" priority={index === 0}/></div>)}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4"><p className="text-sm font-medium text-slate-600">{slides[active].label}</p><div className="flex items-center gap-2"><button onClick={() => move(-1)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600" aria-label="Önceki görsel"><ChevronLeft className="h-4 w-4"/></button><span className="min-w-12 text-center text-xs font-semibold text-slate-400">0{active + 1} / 0{slides.length}</span><button onClick={() => move(1)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600" aria-label="Sonraki görsel"><ChevronRight className="h-4 w-4"/></button></div></div>
      <div className="mt-3 flex gap-1.5">{slides.map((slide, index) => <button key={slide.src} onClick={() => setActive(index)} aria-label={`${index + 1}. görsele git`} className={`h-1.5 rounded-full transition-all ${active === index ? "w-10 bg-blue-600" : "w-5 bg-slate-200"}`}/>)}</div>
    </div>
  );
}
