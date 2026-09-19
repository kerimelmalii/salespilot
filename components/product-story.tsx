import {
  BarChart3,
  Building2,
  FileSearch,
  Mail,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";

const steps = [
  { number: "01", icon: Search, title: "Tarayalım", text: "Sektör, bölge, ürün ve özel kriterlerinize göre potansiyel şirketleri bulalım." },
  { number: "02", icon: FileSearch, title: "Araştıralım", text: "Her şirketi web sitesi, faaliyetleri ve güvenilir kaynakları üzerinden analiz edelim." },
  { number: "03", icon: BarChart3, title: "Puanlayalım", text: "Şirketleri kriterlerinize göre 100 üzerinden, kanıtlarıyla birlikte sıralayalım." },
  { number: "04", icon: Mail, title: "İletişime geçelim", text: "Her şirkete özel mesajı hazırlayalım; son kontrolünüzden sonra gönderelim." },
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

      <section>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Derin şirket analizi</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Bir şirketi nasıl analiz ediyoruz?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-500">Şirketi yalnızca bulmuyor; gerçekten alıcı olup olmadığını, hangi sinyallere dayanarak karar verdiğimizi açıkça gösteriyoruz.</p>
        </div>
        <div className="mt-14 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_90px_-65px_rgba(15,23,42,.45)]">
          <div className="flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-9">
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Building2 className="h-5 w-5"/></span>
              <div><h3 className="font-semibold text-slate-950">ABC Gıda Sanayi A.Ş.</h3><p className="mt-1 text-sm text-slate-500">Gıda üretimi · Bursa</p></div>
            </div>
            <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="text-sm font-medium text-emerald-700">Güçlü eşleşme</span><strong className="ml-2 text-2xl tracking-tight text-slate-950">91</strong><span className="text-sm text-slate-400">/100</span></div>
          </div>
          <div className="grid border-t border-slate-200 md:grid-cols-3">
            {[["01", "Ne yapıyor?", "Gıda üretimi yapıyor ve 30'dan fazla ülkeye ihracat gerçekleştiriyor."], ["02", "Neden uygun?", "Üretim ölçeği, ürün grubu ve bölgesi hedef alıcı profilinizle örtüşüyor."], ["03", "Neye dayanıyor?", "Kurumsal site, ürün sayfaları ve faaliyet bilgileri birbiriyle doğrulanıyor."]].map(([number, title, text], index) => (
              <div key={number} className={`p-6 sm:p-8 ${index < 2 ? "border-b border-slate-200 md:border-b-0 md:border-r" : ""}`}>
                <span className="text-xs font-semibold tracking-[.14em] text-blue-600">{number}</span>
                <h4 className="mt-5 font-semibold text-slate-900">{title}</h4>
                <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 text-xs text-slate-500 sm:px-9"><ShieldCheck className="h-4 w-4 text-blue-600"/> Her değerlendirme doğrulanabilir kaynaklarla desteklenir.</div>
        </div>
      </section>

      <section className="grid gap-12 border-y border-slate-200 py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:gap-24 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Her an yanınızda</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] text-slate-950 sm:text-5xl">Cebinizdeki satış ekibi.</h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">Siz müşterinizle konuşurken SalesPilot arka planda araştırır, doğrular ve bir sonraki fırsatı hazırlar.</p>
          <div className="mt-9 flex items-center gap-3 text-sm font-medium text-slate-700"><span className="h-px w-10 bg-blue-600"/> Tek çalışma alanı, kesintisiz satış akışı.</div>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {assistantFeatures.map(({icon: Icon, title, text}, index) => (
            <article key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6 sm:grid-cols-[2.5rem_2.5rem_11rem_1fr] sm:items-center sm:gap-5">
              <span className="text-xs font-semibold tracking-[.12em] text-slate-400">0{index + 1}</span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-4 w-4"/></span>
              <h3 className="col-start-2 font-semibold text-slate-900 sm:col-start-auto">{title}</h3>
              <p className="col-start-2 text-sm leading-6 text-slate-500 sm:col-start-auto">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
