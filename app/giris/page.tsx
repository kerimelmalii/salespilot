"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";

function GirisForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/giris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Giriş başarısız.");
        return;
      }
      router.push(searchParams.get("next") ?? "/panel");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f5f7f3] lg:grid-cols-2">
      <section className="hidden bg-blue-950 p-12 text-white lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 font-semibold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xs text-blue-950">SP</span>SalesPilot</Link>
        <div className="my-auto max-w-lg"><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-300">Satış çalışma alanı</p><h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-.05em]">Doğru müşteriye giden daha akıllı yol.</h1><p className="mt-6 text-lg leading-8 text-blue-100/65">Hedef şirketleri keşfedin, gerçek alıcıları doğrulayın ve her kararı kanıtla destekleyin.</p><div className="mt-10 space-y-4">{["Kanıta dayalı lead puanlama", "Rakip ve satıcıları otomatik eleme", "Kontrollü e-posta iş akışı"].map((item) => <p key={item} className="flex items-center gap-3 text-sm text-blue-50"><CheckCircle2 className="h-5 w-5 text-blue-300"/>{item}</p>)}</div></div>
        <p className="text-xs text-blue-100/40">SalesPilot · Pilot sürüm</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
      <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4"/>Ana sayfaya dön</Link>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-800"><LockKeyhole className="h-5 w-5"/></span>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-.04em]">Çalışma alanına giriş</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">SalesPilot şu anda davetli pilot kullanıcılarla test ediliyor. Size verilen erişim şifresini girin.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block"><span className="field-label">Erişim şifresi</span>
        <input
          type="password"
          className="field-input py-3.5"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        </label>
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="primary-button w-full py-3.5 disabled:opacity-50"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">Henüz hesabınız yok mu? <Link href="/kayit?plan=demo" className="font-semibold text-blue-600">Ücretsiz kayıt olun</Link></p>
      <p className="mt-6 text-center text-xs leading-5 text-slate-400">Giriş yaparak pilot kullanım koşullarını ve veri güvenliği ilkelerini kabul etmiş olursunuz.</p>
      </div>
      </section>
    </main>
  );
}

export default function GirisPage() {
  return (
    <Suspense>
      <GirisForm />
    </Suspense>
  );
}
