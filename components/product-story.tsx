import {
  BarChart3,
  Building2,
  CalendarDays,
  Factory,
  FileSearch,
  Globe2,
  Mail,
  MapPin,
  Package,
  Search,
  Send,
  TrendingUp,
  UsersRound,
} from "lucide-react";

const steps = [
  { number: "01", icon: Search, title: "Tara", text: "Sektör, bölge, ürün ve özel kriterlerinize göre potansiyel şirketleri bulun." },
  { number: "02", icon: FileSearch, title: "Araştır", text: "Her şirketi web sitesi, faaliyetleri ve güvenilir kaynakları üzerinden analiz edin." },
  { number: "03", icon: BarChart3, title: "Puanla", text: "Şirketleri kriterlerinize göre 100 üzerinden, kanıtlarıyla birlikte sıralayın." },
  { number: "04", icon: Mail, title: "İletişime geç", text: "Her şirkete özel mesajı hazırlayın; son kontrolü yaptıktan sonra gönderin." },
];

const analysisSignals = [
  { icon: MapPin, title: "Konum", text: "Bursa, Türkiye", tone: "blue" },
  { icon: Package, title: "Ürünler", text: "Süt ürünleri ve gıda", tone: "purple" },
  { icon: Factory, title: "Üretim", text: "15.000 m² modern tesis", tone: "orange" },
  { icon: Globe2, title: "İhracat", text: "30+ ülkeye satış", tone: "violet" },
  { icon: TrendingUp, title: "Satış potansiyeli", text: "Büyüyen pazar ve dağıtım", tone: "rose" },
];

const assistantFeatures = [
  { icon: Search, title: "Şirketleri bulur", text: "Hedef pazarınızı farklı aramalarla tarar." },
  { icon: FileSearch, title: "Analiz eder", text: "İhtiyacı ve alıcı rolünü doğrular." },
  { icon: BarChart3, title: "Puanlar", text: "En doğru fırsatları öne çıkarır." },
  { icon: Send, title: "İletişime hazırlar", text: "Kişiselleştirilmiş e-posta oluşturur." },
];

export function ProductStory() {
  return (
    <div className="space-y-28 lg:space-y-36">
      <section>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">SalesPilot nasıl çalışır?</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Aramadan iletişime, dört net adım.</h2>
          <p className="mt-5 text-base leading-7 text-slate-500">Dağınık araştırma araçları yerine bütün satış araştırmasını tek, anlaşılır bir akışta yönetin.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ number, icon: Icon, title, text }) => (
            <article key={number} className="relative rounded-2xl border border-blue-100 bg-white p-6 shadow-[0_24px_70px_-50px_rgba(37,99,235,.55)]">
              <div className="flex items-center justify-between"><span className="text-3xl font-semibold text-blue-200">{number}</span><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span></div>
              <h3 className="mt-10 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid items-center gap-12 lg:grid-cols-[.7fr_1.3fr]">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Derin şirket analizi</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Bir şirketi nasıl analiz ediyoruz?</h2><p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">SalesPilot farklı kaynaklardaki dağınık sinyalleri bir araya getirir; şirketin ne yaptığını ve satış potansiyelini tek ekranda açıklar.</p></div>
        <div className="relative rounded-[2rem] border border-blue-100 bg-[#f3f7ff] p-5 sm:p-8">
          <div className="mx-auto max-w-lg rounded-2xl border border-white bg-white p-5 shadow-[0_25px_70px_-35px_rgba(37,99,235,.25)]">
            <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Building2 className="h-6 w-6"/></span><div><h3 className="font-semibold">ABC Gıda Sanayi A.Ş.</h3><p className="mt-1 text-xs text-slate-400">Gıda üretimi · Bursa, Türkiye</p></div></div><span className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700">Lead skoru<br/><strong className="text-base">91/100</strong></span></div>
            <p className="mt-5 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-500">1998 yılında kurulmuş, üretim kapasitesi ve ihracat ağı doğrulanmış bir gıda üreticisidir. Hedef alıcı profiliyle güçlü eşleşme gösterir.</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-slate-50 p-3"><UsersRound className="mx-auto h-4 w-4 text-blue-600"/><strong className="mt-2 block">250+</strong><span className="text-slate-400">Çalışan</span></div><div className="rounded-xl bg-slate-50 p-3"><Factory className="mx-auto h-4 w-4 text-blue-600"/><strong className="mt-2 block">15.000 m²</strong><span className="text-slate-400">Tesis</span></div><div className="rounded-xl bg-slate-50 p-3"><Globe2 className="mx-auto h-4 w-4 text-blue-600"/><strong className="mt-2 block">30+</strong><span className="text-slate-400">Ülke</span></div></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{analysisSignals.map(({icon:Icon,title,text,tone}) => <div key={title} className="rounded-xl border border-white bg-white/90 p-4"><span className={`analysis-tone analysis-tone-${tone}`}><Icon className="h-4 w-4"/></span><h4 className="mt-3 text-sm font-semibold">{title}</h4><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></div>)}</div>
        </div>
      </section>

      <section className="grid items-center gap-12 rounded-[2rem] bg-[#071b3c] px-6 py-14 text-white sm:px-10 lg:grid-cols-[.8fr_1.2fr] lg:p-14">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-300">Her an yanınızda</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Cebinizdeki satış ekibi.</h2><p className="mt-6 max-w-lg text-lg leading-8 text-blue-100/65">Sizin yerinize araştıran, analiz eden, puanlayan ve ekibinizi doğru müşterilerle buluşturan akıllı bir asistan.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {assistantFeatures.map(({icon:Icon,title,text}) => <article key={title} className="rounded-2xl border border-white/10 bg-white/[.07] p-5 backdrop-blur"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-blue-200"><Icon className="h-5 w-5"/></span><h3 className="mt-6 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-blue-100/55">{text}</p></article>)}
          <div className="sm:col-span-2 grid grid-cols-3 gap-3 rounded-2xl bg-white p-5 text-slate-950"><div><Building2 className="h-4 w-4 text-blue-600"/><strong className="mt-2 block text-2xl">1.248</strong><span className="text-xs text-slate-400">Potansiyel şirket</span></div><div><TrendingUp className="h-4 w-4 text-emerald-500"/><strong className="mt-2 block text-2xl">312</strong><span className="text-xs text-slate-400">Yüksek skorlu lead</span></div><div><CalendarDays className="h-4 w-4 text-orange-500"/><strong className="mt-2 block text-2xl">24</strong><span className="text-xs text-slate-400">Planlanan görüşme</span></div></div>
        </div>
      </section>
    </div>
  );
}
