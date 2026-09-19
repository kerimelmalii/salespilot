import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Lightbulb, ShieldCheck, Target } from "lucide-react";
import { MarketingHeader } from "@/components/marketing-header";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "SalesPilot'ın kanıta dayalı B2B müşteri araştırmasını daha hızlı, şeffaf ve yönetilebilir hâle getirme yaklaşımını keşfedin.",
  alternates: { canonical: "/hakkimizda" },
  openGraph: { title: "Hakkımızda | SalesPilot", description: "B2B satış araştırmasını daha akıllı ve güvenilir hâle getiriyoruz.", url: "/hakkimizda" },
};

const values = [
  { icon: Target, title: "Doğruluk", text: "Kalabalık listeler yerine, gerçekten alıcı olma ihtimali yüksek şirketleri bulmaya odaklanıyoruz." },
  { icon: Eye, title: "Şeffaflık", text: "Her puanın nedenini ve dayandığı kanıtı görünür kılan, incelenebilir bir sistem kuruyoruz." },
  { icon: ShieldCheck, title: "Kontrol", text: "Yapay zekâ araştırmayı hızlandırır; kritik satış kararları ve iletişim her zaman insanın kontrolünde kalır." },
  { icon: Lightbulb, title: "Sadelik", text: "Karmaşık veri araçlarını, küçük ve orta ölçekli ekiplerin rahatça kullanabileceği bir akışa dönüştürüyoruz." },
];

export default function AboutPage() {
  return <main className="min-h-screen bg-white text-slate-950"><MarketingHeader/><section className="relative overflow-hidden border-b border-slate-100 bg-[#f5f8ff]"><div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-200/50 blur-3xl"/><div className="relative mx-auto max-w-5xl px-5 py-24 text-center lg:px-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Hakkımızda</p><h1 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">Satış araştırmasını daha akıllı ve güvenilir hâle getiriyoruz.</h1><p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-500">SalesPilot, şirketlerin saatler süren manuel müşteri araştırmasını; kanıta dayalı, hızlı ve yönetilebilir bir satış sürecine dönüştürmek için geliştiriliyor.</p></div></section>
    <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-2 lg:px-8"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Neden başladık?</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Şirket bulmak kolaylaştı. Doğru şirketi bulmak hâlâ zor.</h2></div><div className="space-y-5 text-base leading-8 text-slate-500"><p>Satış ekipleri arama motorları, firma rehberleri, Excel listeleri ve birbirinden kopuk araçlar arasında zaman kaybediyor. Üstelik bulunan şirketlerin gerçekten hedef müşteri olup olmadığı çoğu zaman belirsiz kalıyor.</p><p>SalesPilot bu sorunu şirketleri yalnızca listeleyerek değil; faaliyetini, konumunu, ürünlerini, üretim yapısını, ihracat sinyallerini ve alıcı rolünü birlikte değerlendirerek çözmeyi hedefliyor.</p></div></section>
    <section className="bg-[#f7f9fd] py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">İlkelerimiz</p><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{values.map(({icon:Icon,title,text}) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-5 w-5"/></span><h3 className="mt-7 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{text}</p></article>)}</div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="rounded-2xl bg-[#071b3c] px-7 py-16 text-center text-white"><h2 className="text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Doğru müşteriye giden yolu kısaltın.</h2><p className="mx-auto mt-4 max-w-xl text-blue-100/65">SalesPilot’ı ücretsiz deneyin ve ilk hedef listenizi kanıtlarıyla birlikte oluşturun.</p><Link href="/kayit?plan=demo" className="mt-8 inline-flex rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-500">Ücretsiz demo oluştur</Link></div></section></main>;
}
