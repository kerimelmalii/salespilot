import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingHeader } from "@/components/marketing-header";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-posts";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: { type: "article", locale: "tr_TR", url, title: post.title, description: post.description, publishedTime: post.publishedAt, authors: ["SalesPilot"] },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    inLanguage: "tr-TR",
    mainEntityOfPage: `https://salespilot-orpin.vercel.app/blog/${post.slug}`,
    author: { "@type": "Organization", name: "SalesPilot" },
    publisher: { "@type": "Organization", name: "SalesPilot" },
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <article>
        <header className="border-b border-slate-200 bg-[#f7f9fd]">
          <div className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-24">
            <Link href="/blog" className="text-sm font-semibold text-blue-700">← Bloga dön</Link>
            <p className="mt-12 text-xs font-semibold uppercase tracking-[.16em] text-blue-700">{post.category}</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.05em] sm:text-6xl">{post.title}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">{post.description}</p>
            <div className="mt-8 flex gap-4 text-sm text-slate-400"><time dateTime={post.publishedAt}>19 Eylül 2026</time><span>·</span><span>{post.readTime} okuma</span></div>
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
          {post.sections.map((section) => (
            <section key={section.heading} className="mb-14 last:mb-0">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{section.heading}</h2>
              <div className="mt-5 space-y-5 text-base leading-8 text-slate-600">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
              {section.bullets ? <ul className="mt-6 space-y-3 border-l-2 border-blue-200 pl-6 text-base leading-7 text-slate-600">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
            </section>
          ))}
          <div className="mt-16 rounded-2xl bg-[#071b3c] p-8 text-white sm:p-10"><h2 className="text-2xl font-semibold">Doğru şirketleri daha hızlı bulun.</h2><p className="mt-3 text-sm leading-7 text-blue-100/70">SalesPilot ile hedef pazarınızı tarayın, şirketleri kanıtlarla değerlendirin ve satış ekibinizin odağını güçlendirin.</p><Link href="/kayit?plan=demo" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#071b3c]">Ücretsiz demo başlat →</Link></div>
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    </main>
  );
}
