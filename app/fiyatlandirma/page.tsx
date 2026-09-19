import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingHeader } from "@/components/marketing-header";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description: "SalesPilot Demo, Growth ve Pro paketlerini karşılaştırın; B2B müşteri bulma ve lead puanlama ihtiyaçlarınıza uygun planı seçin.",
  alternates: { canonical: "/fiyatlandirma" },
  openGraph: { title: "SalesPilot Fiyatlandırma", description: "Ekibinize uygun B2B satış zekâsı planını seçin.", url: "/fiyatlandirma" },
};

const plans = [
  { id: "demo", name: "Demo", price: "₺0", suffix: "14 gün", description: "SalesPilot’ın doğru lead yaklaşımını risksiz deneyin.", features: ["1 kullanıcı", "2 şirket taraması", "Tarama başına 10 aday", "Temel şirket analizi", "Kanıta dayalı puanlama"], cta: "Ücretsiz dene", featured: false },
  { id: "growth", name: "Growth", price: "₺1.490", suffix: "/ ay", description: "Düzenli olarak yeni müşteri arayan küçük satış ekipleri için.", features: ["3 kullanıcı", "Ayda 20 tarama", "Tarama başına 50+ aday", "Gelişmiş şirket analizi", "Lead kaydetme ve geçmiş", "AI e-posta taslağı"], cta: "Growth ile başla", featured: true },
  { id: "pro", name: "Pro", price: "₺3.490", suffix: "/ ay", description: "Daha yüksek hacim, ekip çalışması ve öncelikli destek isteyenler için.", features: ["10 kullanıcı", "Ayda 60 tarama", "Tarama başına 100+ aday", "Özel puanlama kriterleri", "Ekip ve rol yönetimi", "Öncelikli destek", "Dışa aktarma ve raporlama"], cta: "Pro ile başla", featured: false },
];

export default function PricingPage() {
  return <main className="min-h-screen bg-[#f7f9fd] text-slate-950"><MarketingHeader/><section className="mx-auto max-w-7xl px-5 pb-24 pt-20 text-center lg:px-8"><span className="inline-flex rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Basit ve şeffaf fiyatlandırma</span><h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-[-.05em] sm:text-6xl">İhtiyacınız kadar başlayın, büyüdükçe ilerleyin.</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-500">Önce ücretsiz demoyla gerçek bir hedef araması yapın. Değerini gördüğünüzde ekibinize uygun pakete geçin.</p>
      <div className="mt-14 grid gap-5 text-left lg:grid-cols-3">{plans.map((plan) => <article key={plan.id} className={`relative flex flex-col rounded-2xl border bg-white p-7 ${plan.featured ? "border-blue-500 shadow-[0_25px_70px_-35px_rgba(37,99,235,.45)]" : "border-slate-200"}`}>{plan.featured ? <span className="absolute -top-3 right-5 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white">En çok tercih edilen</span> : null}<h2 className="text-lg font-semibold">{plan.name}</h2><p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p><div className="mt-7 flex items-end gap-2"><span className="text-4xl font-semibold tracking-tight">{plan.price}</span><span className="pb-1 text-sm text-slate-400">{plan.suffix}</span></div><Link href={`/kayit?plan=${plan.id}`} className={`mt-7 rounded-lg px-5 py-3 text-center text-sm font-semibold transition ${plan.featured ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700"}`}>{plan.cta}</Link><div className="mt-7 space-y-3 border-t border-slate-100 pt-6">{plan.features.map((feature) => <p key={feature} className="flex items-start gap-2.5 text-sm text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"/>{feature}</p>)}</div></article>)}</div><p className="mt-8 text-xs text-slate-400">Fiyatlar pilot dönem için önerilen aylık fiyatlardır. Ücretli tahsilat Stripe bağlantısı tamamlandıktan sonra etkinleşecektir.</p></section></main>;
}
