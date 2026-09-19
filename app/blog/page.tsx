import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";

export const metadata: Metadata = {
  title: "Blog | SalesPilot",
  description: "B2B satış, hedef müşteri bulma, lead doğrulama ve satış zekâsı üzerine SalesPilot içerikleri.",
};

const posts = [
  { category: "Hedefleme", title: "Doğru B2B hedef kitle nasıl belirlenir?", text: "İyi bir hedef kitle tanımı yalnızca sektör adı değildir. Bölge, şirket türü, ürün ihtiyacı ve alıcı rolü birlikte düşünülmelidir.", readTime: "6 dk okuma" },
  { category: "Satış zekâsı", title: "Şirket listesi değil, satış kararı", text: "Uzun listeler ekibe daha fazla iş çıkarır. Değerli olan, şirketin neden uygun olduğunu açıklayan ve sonraki adımı netleştiren bilgidir.", readTime: "5 dk okuma" },
  { category: "Yapay zekâ", title: "Lead puanı ne zaman güvenilirdir?", text: "Puanlama; açık kriterlere, doğrulanabilir kaynaklara ve belirsizliği dürüstçe gösteren bir değerlendirme sistemine dayanmalıdır.", readTime: "7 dk okuma" },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#f7f9fd] text-slate-950">
      <MarketingHeader />
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-20 lg:px-8 lg:pb-24 lg:pt-28">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">SalesPilot Blog</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-.05em] sm:text-6xl">Daha doğru müşteriler için daha net fikirler.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-500">B2B araştırma, hedefleme ve satış zekâsını uygulanabilir yöntemlerle ele alan kısa içerikler.</p>
      </section>
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl divide-y divide-slate-200 px-5 lg:px-8">
          {posts.map((post, index) => (
            <article key={post.title} className="grid gap-5 py-10 md:grid-cols-[4rem_1fr_auto] md:items-start md:gap-8 lg:py-14">
              <span className="text-sm font-semibold text-blue-600">0{index + 1}</span>
              <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">{post.category}</p><h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{post.title}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">{post.text}</p></div>
              <span className="text-sm text-slate-400">{post.readTime}</span>
            </article>
          ))}
        </div>
      </section>
      <div className="mx-auto flex max-w-7xl justify-center px-5 py-16 lg:px-8"><Link href="/kayit?plan=demo" className="rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15">Ücretsiz demo başlat →</Link></div>
    </main>
  );
}
