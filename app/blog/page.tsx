import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "B2B Satış ve Lead Bulma Blogu",
  description: "B2B satış, hedef müşteri bulma, lead doğrulama ve satış zekâsı üzerine SalesPilot içerikleri.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "SalesPilot Blog | B2B Satış ve Lead Bulma", description: "B2B hedefleme, lead doğrulama ve satış zekâsı üzerine uygulanabilir içerikler.", url: "/blog", type: "website" },
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#f7f9fd] text-slate-950">
      <MarketingHeader />
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-20 lg:px-8 lg:pb-24 lg:pt-28">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">SalesPilot Blog</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-.05em] sm:text-6xl">Daha doğru müşteriler için daha net fikirler.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-500">B2B araştırma, hedefleme ve satış zekâsını uygulanabilir yöntemlerle ele alan kısa içerikler.</p>
      </section>
      <section className="border-y border-slate-200 bg-white py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="flex min-h-80 flex-col rounded-2xl border border-slate-200 bg-[#f8faff] p-7 shadow-[0_20px_55px_-48px_rgba(37,99,235,.55)]">
              <div className="flex items-center justify-between text-xs"><span className="font-semibold uppercase tracking-[.14em] text-blue-700">{post.category}</span><time dateTime={post.publishedAt} className="text-slate-400">{post.readTime}</time></div>
              <h2 className="mt-10 text-2xl font-semibold leading-8 tracking-tight">{post.title}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="mt-auto inline-flex w-fit rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">Oku <span className="ml-2" aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      </section>
      <div className="mx-auto flex max-w-7xl justify-center px-5 py-16 lg:px-8"><Link href="/kayit?plan=demo" className="rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15">Ücretsiz demo başlat →</Link></div>
    </main>
  );
}
