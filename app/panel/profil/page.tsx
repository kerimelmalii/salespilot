"use client";

import { Building2, Check, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { readProfile, saveProfile, type WorkspaceProfile } from "@/lib/salespilot/workspace-storage";

export default function ProfilePage() {
  const [profile, setProfile] = useState<WorkspaceProfile>({ fullName: "SalesPilot Kullanıcısı", email: "", companyName: "", website: "", role: "Satış ve İş Geliştirme" });
  const [saved, setSaved] = useState(false);
  useEffect(() => setProfile(readProfile()), []);
  const update = (key: keyof WorkspaceProfile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); saveProfile(profile); setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  return <div><p className="eyebrow">Hesabım</p><h1 className="page-title">Profil ve şirket bilgileri</h1><p className="page-description">Bu bilgiler yeni aramalarda şirket profilinizi daha hızlı oluşturmak için kullanılır.</p>
    <div className="mt-8 grid gap-6 xl:grid-cols-[.65fr_1.35fr]">
      <aside className="surface-card p-6"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-100 text-xl font-semibold text-blue-800">{profile.fullName.split(" ").slice(0,2).map((part) => part[0]).join("").toUpperCase() || "SP"}</span><h2 className="mt-5 text-xl font-semibold">{profile.fullName || "SalesPilot Kullanıcısı"}</h2><p className="mt-1 text-sm text-slate-400">{profile.role}</p><div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm"><p className="flex items-center gap-2 text-slate-500"><Building2 className="h-4 w-4"/>{profile.companyName || "Şirket belirtilmedi"}</p><p className="flex items-center gap-2 text-slate-500"><UserRound className="h-4 w-4"/>Pilot hesap</p></div></aside>
      <form onSubmit={submit} className="surface-card p-6 sm:p-8"><h2 className="font-semibold">Temel bilgiler</h2><p className="mt-1 text-xs text-slate-400">Profil ve şirket ayrıntılarınızı güncelleyin.</p><div className="mt-7 grid gap-5 sm:grid-cols-2"><ProfileField label="Ad soyad" value={profile.fullName} onChange={(value) => update("fullName", value)}/><ProfileField label="E-posta" type="email" value={profile.email} onChange={(value) => update("email", value)}/><ProfileField label="Şirket adı" value={profile.companyName} onChange={(value) => update("companyName", value)}/><ProfileField label="Web sitesi" value={profile.website} placeholder="https://" onChange={(value) => update("website", value)}/><ProfileField label="Göreviniz" value={profile.role} onChange={(value) => update("role", value)}/></div><div className="mt-7 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">{saved ? <span className="flex items-center gap-1.5 text-sm font-medium text-blue-700"><Check className="h-4 w-4"/>Kaydedildi</span> : null}<button className="primary-button" type="submit">Değişiklikleri kaydet</button></div></form>
    </div>
  </div>;
}

function ProfileField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="field-label">{label}</span><input className="field-input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)}/></label>;
}
