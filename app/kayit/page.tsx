"use client";

import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const PLAN_LABELS: Record<string, string> = { demo: "Ücretsiz Demo", growth: "Growth", pro: "Pro" };

function RegistrationForm() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "demo";
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", website: "" });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    window.localStorage.setItem("salespilot:pending-registration:v1", JSON.stringify({ ...form, plan, createdAt: new Date().toISOString() }));
    setSubmitted(true);
  }

  if (submitted) return <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-xl shadow-blue-950/5"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600"><CheckCircle2 className="h-7 w-7"/></span><h1 className="mt-6 text-2xl font-semibold tracking-tight">Pilot kaydınız alındı</h1><p className="mt-3 text-sm leading-6 text-slate-500">{PLAN_LABELS[plan] ?? "Seçtiğiniz paket"} için bilgileriniz bu cihazda kaydedildi. Gerçek üyelik sistemi açıldığında hesabınızı e-posta ile etkinleştireceğiz.</p><Link href="/giris?next=/panel" className="mt-7 inline-flex w-full justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Mevcut pilot hesabıyla giriş yap</Link><Link href="/" className="mt-4 block text-sm font-medium text-slate-400">Ana sayfaya dön</Link></div>;

  return <div className="w-full max-w-md"><Link href="/" className="flex items-center gap-3 font-semibold"><span className="flex h-10 items-end gap-1 rounded-xl bg-blue-600 px-2.5 py-2"><i className="h-2 w-1.5 rounded-sm bg-white/80"/><i className="h-4 w-1.5 rounded-sm bg-white/90"/><i className="h-6 w-1.5 rounded-sm bg-white"/></span>SalesPilot</Link><div className="mt-10"><span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><Sparkles className="h-3.5 w-3.5"/>{PLAN_LABELS[plan] ?? "Demo"} paketi</span><h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">Hesabınızı oluşturun</h1><p className="mt-2 text-sm leading-6 text-slate-500">SalesPilot’ın pilot programına katılmak için temel bilgilerinizi girin.</p></div><form onSubmit={submit} className="mt-8 space-y-4"><Field label="Ad soyad" value={form.name} onChange={(value) => setForm({...form,name:value})}/><Field label="İş e-postası" type="email" value={form.email} onChange={(value) => setForm({...form,email:value})}/><Field label="Şirket adı" value={form.company} onChange={(value) => setForm({...form,company:value})}/><Field label="Web sitesi" value={form.website} placeholder="https://" onChange={(value) => setForm({...form,website:value})}/><button type="submit" className="w-full rounded-lg bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700">Kayıt talebi oluştur</button></form><p className="mt-6 text-center text-sm text-slate-500">Zaten pilot erişiminiz var mı? <Link href="/giris?next=/panel" className="font-semibold text-blue-600">Giriş yapın</Link></p></div>;
}

function Field({label,value,onChange,type="text",placeholder}:{label:string;value:string;onChange:(value:string)=>void;type?:string;placeholder?:string}) { return <label className="block"><span className="field-label">{label}</span><input required className="field-input py-3" type={type} value={value} placeholder={placeholder} onChange={(event)=>onChange(event.target.value)}/></label>; }

export default function RegistrationPage() {
  return <main className="grid min-h-screen bg-[#f7f9fd] lg:grid-cols-[1fr_.9fr]"><section className="hidden bg-[#071b3c] p-12 text-white lg:flex lg:flex-col"><Link href="/fiyatlandirma" className="text-sm text-blue-200">← Paketlere dön</Link><div className="my-auto max-w-lg"><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-300">SalesPilot’a katılın</p><h2 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-.05em]">Daha az araştırın. Daha doğru müşteriler bulun.</h2><p className="mt-6 text-lg leading-8 text-blue-100/65">Hedef şirketleri keşfetmekten kişiselleştirilmiş iletişime kadar bütün satış araştırmasını tek yerde yönetin.</p></div><p className="text-xs text-blue-100/40">14 günlük demo · Kredi kartı gerekmez</p></section><section className="flex items-center justify-center px-5 py-12"><Suspense fallback={<div className="text-sm text-slate-400">Form hazırlanıyor…</div>}><RegistrationForm/></Suspense></section></main>;
}
