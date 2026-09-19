import {
  BarChart3,
  FileSearch,
  Mail,
  Search,
} from "lucide-react";

const steps = [
  { number: "01", icon: Search, title: "Tarayalım", text: "Sektör, bölge, ürün ve özel kriterlerinize göre potansiyel şirketleri bulalım." },
  { number: "02", icon: FileSearch, title: "Araştıralım", text: "Her şirketi web sitesi, faaliyetleri ve güvenilir kaynakları üzerinden analiz edelim." },
  { number: "03", icon: BarChart3, title: "Puanlayalım", text: "Şirketleri kriterlerinize göre 100 üzerinden, kanıtlarıyla birlikte sıralayalım." },
  { number: "04", icon: Mail, title: "İletişime geçelim", text: "Her şirkete özel mesajı hazırlayalım; son kontrolünüzden sonra gönderelim." },
];

const analysisSteps = [
  { number: "1", title: "Şirketi doğrularız", text: "Kurumsal sitesini, faaliyet alanını ve bulunduğu bölgeyi kontrol ederiz." },
  { number: "2", title: "Ne yaptığını anlarız", text: "Ürünlerini, üretim yapısını ve hizmet verdiği pazarı inceleriz." },
  { number: "3", title: "Alıcı rolünü test ederiz", text: "Gerçek alıcıları; satıcı, rakip ve ilgisiz sonuçlardan ayırırız." },
  { number: "4", title: "Kanıtlarla puanlarız", text: "Hedef kriterlerinizle eşleşmesini açık gerekçeler ve doğrulanabilir kaynaklarla puanlarız." },
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

      <section className="grid gap-14 lg:grid-cols-[1.1fr_.9fr] lg:items-start lg:gap-24">
        <div className="order-2 lg:order-1">
          <div className="relative">
            <div className="absolute bottom-8 left-5 top-8 w-px bg-blue-200" aria-hidden="true" />
            <div className="space-y-12">
              {analysisSteps.map(({ number, title, text }) => (
                <article key={number} className="relative grid grid-cols-[2.5rem_1fr] gap-6">
                  <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-blue-200 bg-white text-sm font-semibold text-blue-600 shadow-[0_0_0_6px_white]">{number}</span>
                  <div className="pb-2">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
                    <p className="mt-2 max-w-lg text-sm leading-7 text-slate-500">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2 lg:sticky lg:top-28 lg:pt-3">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-600">Derin şirket analizi</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] text-slate-950 sm:text-5xl">Bir şirketi nasıl analiz ediyoruz?</h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-500">Bir şirketi yalnızca ismine göre değil; kimliği, faaliyeti, alıcı rolü ve hedeflerinizle gerçek uyumu üzerinden değerlendiriyoruz.</p>
          <p className="mt-8 border-l-2 border-blue-600 pl-5 text-sm leading-7 text-slate-600">Sonuç: neden uygun olduğunu açıkça görebildiğiniz, kanıta dayalı bir satış kararı.</p>
        </div>
      </section>
    </div>
  );
}
