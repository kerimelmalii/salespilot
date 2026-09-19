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

export function ProductStory() {
  return (
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
  );
}
