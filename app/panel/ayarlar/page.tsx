"use client";

import { Bell, Database, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [emailApproval, setEmailApproval] = useState(true);
  const [notifications, setNotifications] = useState(true);
  return <div><p className="eyebrow">Çalışma alanı</p><h1 className="page-title">Ayarlar</h1><p className="page-description">Tarama, bildirim ve güvenlik tercihlerinizi yönetin.</p>
    <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_.55fr]"><section className="surface-card overflow-hidden"><div className="border-b border-slate-100 p-6"><h2 className="font-semibold">Tercihler</h2><p className="mt-1 text-xs text-slate-400">Çalışma alanınızın davranışını belirleyin.</p></div><SettingRow icon={Mail} title="E-posta için insan onayı" description="Hiçbir mesaj açık onayınız olmadan gönderilmez." checked={emailApproval} onChange={setEmailApproval}/><SettingRow icon={Bell} title="Tarama bildirimleri" description="Uzun süren taramalar tamamlandığında bildirim göster." checked={notifications} onChange={setNotifications}/></section><aside className="space-y-4"><div className="surface-card p-6"><LockKeyhole className="h-5 w-5 text-blue-700"/><h2 className="mt-5 font-semibold">Erişim güvenliği</h2><p className="mt-2 text-sm leading-6 text-slate-500">Çalışma alanı şu anda güvenli pilot erişim şifresiyle korunuyor.</p><span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Pilot kimlik doğrulama</span></div><div className="surface-card p-6"><Database className="h-5 w-5 text-blue-700"/><h2 className="mt-5 font-semibold">Veri saklama</h2><p className="mt-2 text-sm leading-6 text-slate-500">Profil, geçmiş ve kayıtlı lead&apos;ler bu pilot sürümde kullandığınız tarayıcıda saklanır.</p></div></aside></div>
  </div>;
}

function SettingRow({ icon: Icon, title, description, checked, onChange }: { icon: typeof Mail; title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center gap-4 border-b border-slate-100 p-6 last:border-0"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon className="h-5 w-5"/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div><button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-blue-700" : "bg-slate-200"}`} aria-pressed={checked}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`}/></button></div>;
}
