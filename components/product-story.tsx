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

      <section className="grid items-start gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
        <div className="lg:pt-8">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Derin şirket analizi</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Bir şirketi nasıl analiz ediyoruz?</h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">Dağınık şirket verilerini tek bir karar görünümünde topluyor; alıcı rolünü, kapasiteyi ve satış potansiyelini kanıtlarıyla açıklıyoruz.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_-56px_rgba(37,99,235,.5)]">
          <div className="flex flex-col gap-5 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Building2 className="h-6 w-6"/></span>
              <div><h3 className="font-semibold text-slate-900">ABC Gıda Sanayi A.Ş.</h3><p className="mt-1 text-sm text-slate-500">Gıda üretimi · Bursa, Türkiye</p></div>
            </div>
            <div className="flex items-baseline gap-2 sm:text-right"><strong className="text-3xl font-semibold tracking-tight text-emerald-600">91</strong><span className="text-sm text-slate-400">/ 100 eşleşme</span></div>
          </div>
          <p className="px-6 py-6 text-sm leading-7 text-slate-600 sm:px-8">Üretim kapasitesi ve ihracat ağı doğrulanmış bir gıda üreticisi. Hedef alıcı profiliyle güçlü eşleşme gösteriyor.</p>
          <div className="border-t border-slate-200 px-6 sm:px-8">
            {analysisSignals.map(({icon: Icon, title, text, tone}) => (
              <div key={title} className="grid grid-cols-[2.5rem_1fr] items-center gap-3 border-b border-slate-100 py-4 last:border-0 sm:grid-cols-[2.5rem_10rem_1fr]">
                <span className={`analysis-tone analysis-tone-${tone}`}><Icon className="h-4 w-4"/></span>
                <h4 className="text-sm font-medium text-slate-800">{title}</h4>
                <p className="col-start-2 text-sm text-slate-500 sm:col-start-auto sm:text-right">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid items-center gap-12 rounded-[2rem] border border-blue-100 bg-[#f6f9ff] px-6 py-14 sm:px-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:p-14">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Her an yanınızda</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] text-slate-950 sm:text-5xl">Cebinizdeki satış ekibi.</h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">Araştıran, doğrulayan ve en doğru fırsatı ekibinizin önüne getiren sade bir satış çalışma alanı.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_-56px_rgba(37,99,235,.5)]">
          <div className="grid sm:grid-cols-2">
            {assistantFeatures.map(({icon: Icon, title, text}, index) => (
              <article key={title} className={`p-6 sm:p-7 ${index < 2 ? "border-b border-slate-100" : ""} ${index % 2 === 0 ? "sm:border-r" : ""}`}>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-4 w-4"/></span>
                <h3 className="mt-5 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
          <div className="grid grid-cols-1 border-t border-slate-200 bg-slate-50/70 sm:grid-cols-3">
            {[[Building2, "1.248", "Potansiyel şirket"], [TrendingUp, "312", "Yüksek skorlu lead"], [CalendarDays, "24", "Planlanan görüşme"]].map(([MetricIcon, value, label], index) => {
              const Icon = MetricIcon as typeof Building2;
              return <div key={String(label)} className={`p-5 ${index < 2 ? "border-b border-slate-200 sm:border-b-0 sm:border-r" : ""}`}><Icon className="h-4 w-4 text-blue-600"/><strong className="mt-3 block text-2xl text-slate-950">{String(value)}</strong><span className="text-xs text-slate-500">{String(label)}</span></div>;
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
