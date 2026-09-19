"use client";

import Link from "next/link";
import { Bookmark, CheckCircle2, Database, ShieldCheck, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  CompanyResearch,
  ScoreBreakdown,
  ScanRequest,
  ExtraCriterion,
  EmailDraft,
  CompanyCandidate,
} from "@/lib/salespilot/types";
import { isOptedOut, markOptedOut } from "@/lib/opt-out";
import { readProfile, readSavedLeads, saveHistoryItem, toggleSavedLead } from "@/lib/salespilot/workspace-storage";
import { MarketingHeader } from "@/components/marketing-header";
import { ProductStory } from "@/components/product-story";

type RowStatus = "idle" | "researching" | "scoring" | "done" | "error";
type EmailStatus = "idle" | "drafting" | "ready" | "approved" | "sending" | "sent" | "error";
type ReplyStatus =
  | "beklemede"
  | "ilgileniyor"
  | "fiyat_istedi"
  | "gorusme_istedi"
  | "daha_sonra"
  | "ilgilenmiyor";

const REPLY_STATUS_LABELS: Record<ReplyStatus, string> = {
  beklemede: "Cevap bekleniyor",
  ilgileniyor: "🟢 İlgileniyor",
  fiyat_istedi: "💰 Fiyat istedi",
  gorusme_istedi: "📅 Görüşme istedi",
  daha_sonra: "🟡 Daha sonra iletişime geçin",
  ilgilenmiyor: "🔴 İlgilenmiyor",
};

const BUYER_ROLE_LABELS = {
  oem_manufacturer: "OEM / makine üreticisi",
  system_integrator: "Sistem entegratörü",
  end_user: "Son kullanıcı",
  distributor: "Distribütör / kanal adayı",
  service_provider: "Hizmet şirketi",
  direct_competitor: "Doğrudan rakip",
  unknown: "Rol doğrulanamadı",
} as const;

const REVIEW_STATUS_LABELS = {
  qualified: "Nitelikli",
  unqualified: "Eşik altında",
  needs_research: "Araştırma gerekli",
  disqualified: "Uygun değil",
} as const;

interface CompanyRow extends CompanyCandidate {
  status: RowStatus;
  research?: CompanyResearch;
  score?: ScoreBreakdown;
  errorMessage?: string;
  emailStatus: EmailStatus;
  emailDraft?: EmailDraft;
  emailError?: string;
  sentAt?: string;
  sentTestMode?: boolean;
  replyStatus?: ReplyStatus;
  sendError?: string;
}

/**
 * Bu, Faz 0/1 için TEST amaçlı sade bir sayfa - uçtan uca zinciri
 * (ara -> araştır -> puanla) doğrulamak için. Nihai "Yeni Tarama" ekranının
 * tasarımı Faz 2'de, mockup'larla uyumlu şekilde ayrıca yapılacak.
 */
export function Dashboard({ embedded = false }: { embedded?: boolean }) {
  const [userCompanyName, setUserCompanyName] = useState("");
  const [userWebsite, setUserWebsite] = useState("");
  const [targetSector, setTargetSector] = useState("");
  const [targetRegion, setTargetRegion] = useState("");
  const [productOrService, setProductOrService] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [extraCriteria, setExtraCriteria] = useState("");
  const [scoreThreshold, setScoreThreshold] = useState(75);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [savedDomains, setSavedDomains] = useState<Set<string>>(() => new Set());

  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSummary, setSearchSummary] = useState<{
    targetCount: number;
    targetReached: boolean;
    searchRequests: number;
    rejectedCount: number;
  } | null>(null);

  useEffect(() => {
    const profile = readProfile();
    setUserCompanyName((value) => value || profile.companyName);
    setUserWebsite((value) => value || profile.website);
    setSavedDomains(new Set(readSavedLeads().map((lead) => lead.domain)));
  }, []);

  function buildScanRequest(): ScanRequest {
    return {
      userCompanyName,
      userWebsite,
      productOrService,
      targetSector,
      targetRegion,
      companyType: companyType || undefined,
      extraCriteria,
      scoreThreshold,
    };
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchError(null);
    setRows([]);
    setSearchSummary(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSector,
          targetRegion,
          productOrService,
          extraCriteria,
          companyType,
          targetCount: 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Bilinmeyen hata.");
      } else {
        const searchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setCurrentSearchId(searchId);
        setSearchSummary({
          targetCount: data.targetCount,
          targetReached: data.targetReached,
          searchRequests: data.searchRequests,
          rejectedCount: data.rejectedCount,
        });
        setRows(
          data.companies.map((c: CompanyCandidate) => ({
            ...c,
            status: "idle" as RowStatus,
            emailStatus: "idle" as EmailStatus,
          }))
        );
        saveHistoryItem({
          id: searchId,
          createdAt: new Date().toISOString(),
          request: buildScanRequest(),
          discovered: data.companies.length,
          qualified: 0,
          status: "discovered",
        });
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setSearching(false);
    }
  }

  function updateRow(domain: string, patch: Partial<CompanyRow>) {
    setRows((prev) => prev.map((r) => (r.domain === domain ? { ...r, ...patch } : r)));
  }

  async function processCompany(
    row: CompanyRow,
    scanRequest: ScanRequest,
    extraCriteriaRubric: ExtraCriterion[]
  ): Promise<boolean> {
    updateRow(row.domain, { status: "researching", errorMessage: undefined });

    try {
      const researchRes = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: row.title, domain: row.domain, scanRequest }),
      });
      const researchData = await researchRes.json();
      if (!researchRes.ok) throw new Error(researchData.error ?? "Araştırma hatası");

      updateRow(row.domain, { status: "scoring", research: researchData.research });

      const scoreRes = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          research: researchData.research,
          scanRequest,
          extraCriteriaRubric,
        }),
      });
      const scoreData = await scoreRes.json();
      if (!scoreRes.ok) throw new Error(scoreData.error ?? "Puanlama hatası");

      updateRow(row.domain, { status: "done", score: scoreData.score });
      return scoreData.score.reviewStatus === "qualified";
    } catch (err) {
      updateRow(row.domain, {
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
      return false;
    }
  }

  async function handleProcessAll() {
    setProcessing(true);
    const scanRequest = buildScanRequest();

    // Kriterleri BİR KEZ ayrıştırıyoruz - tüm şirketler aynı cetvelle
    // puanlanacak, aksi halde puanlar karşılaştırılamaz hale gelir.
    let extraCriteriaRubric: ExtraCriterion[] = [];
    try {
      const criteriaRes = await fetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanRequest),
      });
      const criteriaData = await criteriaRes.json();
      if (!criteriaRes.ok) throw new Error(criteriaData.error ?? "Kriter ayrıştırma hatası");
      extraCriteriaRubric = criteriaData.rubric;
    } catch (err) {
      setSearchError(
        `Kriterler ayrıştırılamadı: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`
      );
      setProcessing(false);
      return;
    }

    // 50+ adayda tamamen seri işleme gereksiz yavaş kalır. Üç worker ile
    // kontrollü paralellik kullanarak API hız limitlerini zorlamadan işleriz.
    let cursor = 0;
    let qualifiedCount = 0;
    const workers = Array.from({ length: Math.min(3, rows.length) }, async () => {
      while (cursor < rows.length) {
        const row = rows[cursor];
        cursor += 1;
        // eslint-disable-next-line no-await-in-loop
        const qualified = await processCompany(row, scanRequest, extraCriteriaRubric);
        if (qualified) qualifiedCount += 1;
      }
    });
    await Promise.all(workers);
    if (currentSearchId) {
      saveHistoryItem({ id: currentSearchId, createdAt: new Date().toISOString(), request: scanRequest, discovered: rows.length, qualified: qualifiedCount, status: "completed" });
    }
    setProcessing(false);
  }

  function handleSaveLead(row: CompanyRow) {
    const saved = toggleSavedLead(row, { score: row.score?.totalScore, sector: targetSector, region: targetRegion });
    setSavedDomains((current) => {
      const next = new Set(current);
      if (saved) next.add(row.domain); else next.delete(row.domain);
      return next;
    });
  }

  async function handleDraftEmail(row: CompanyRow) {
    if (!row.research) return;
    updateRow(row.domain, { emailStatus: "drafting", emailError: undefined });

    try {
      const res = await fetch("/api/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ research: row.research, scanRequest: buildScanRequest() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mail taslağı hatası");
      updateRow(row.domain, { emailStatus: "ready", emailDraft: data.draft });
    } catch (err) {
      updateRow(row.domain, {
        emailStatus: "error",
        emailError: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    }
  }

  function handleEditDraft(row: CompanyRow, patch: Partial<EmailDraft>) {
    if (!row.emailDraft) return;
    updateRow(row.domain, { emailDraft: { ...row.emailDraft, ...patch } });
  }

  function handleApprove(row: CompanyRow) {
    if (!row.emailDraft) return;
    // NOT: Bu sadece "onaylandı" olarak işaretliyor, GERÇEKTEN GÖNDERMİYOR.
    // Gerçek gönderim ayrı bir "Gönder" adımı - aşağıdaki handleSendEmail.
    updateRow(row.domain, {
      emailStatus: "approved",
      emailDraft: { ...row.emailDraft, approvedAt: new Date().toISOString() },
    });
  }

  async function handleSendEmail(row: CompanyRow) {
    if (!row.emailDraft || !row.research) return;
    const to = row.research.contactEmails[0]?.email;
    if (!to) return;

    updateRow(row.domain, { emailStatus: "sending", sendError: undefined });

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject: row.emailDraft.subject, body: row.emailDraft.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gönderim hatası");

      updateRow(row.domain, {
        emailStatus: "sent",
        sentAt: data.result.sentAt,
        sentTestMode: data.result.testMode,
        replyStatus: "beklemede",
      });
    } catch (err) {
      // Taslak hâlâ hazır bekliyor - "approved"a geri dönüp tekrar
      // denemeye izin veriyoruz, ayrı bir "error" durumuna geçmiyoruz.
      updateRow(row.domain, {
        emailStatus: "approved",
        sendError: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    }
  }

  function handleReplyStatusChange(row: CompanyRow, status: ReplyStatus) {
    updateRow(row.domain, { replyStatus: status });
    // Kullanıcı "İlgilenmiyor" işaretlerse, bunu opt-out ile karıştırmayın -
    // ilgilenmemek ayrı bir şey, ret hakkını kullanmak ayrı. Karışıklık
    // olmasın diye burada otomatik opt-out YAPMIYORUZ, kullanıcı isterse
    // ayrıca "Ret Etti" butonunu kullanır.
  }

  function handleOptOut(row: CompanyRow) {
    markOptedOut(row.domain);
    updateRow(row.domain, { emailStatus: "idle", emailDraft: undefined });
    // Yeniden render tetiklemek için rows'u da güncelliyoruz (localStorage
    // React state'i değil, bu yüzden isOptedOut() sonucu otomatik yansımaz).
    setRows((prev) => [...prev]);
  }

  function handleExportResults() {
    const completed = rows.filter((row) => row.status === "done" && row.research && row.score);
    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      scanRequest: buildScanRequest(),
      summary: {
        discovered: rows.length,
        completed: completed.length,
        qualified: completed.filter((row) => row.score?.reviewStatus === "qualified").length,
        needsResearch: completed.filter((row) => row.score?.reviewStatus === "needs_research").length,
        disqualified: completed.filter((row) => row.score?.reviewStatus === "disqualified").length,
      },
      results: completed.map((row) => ({
        domain: row.domain,
        discovery: {
          title: row.title,
          url: row.url,
          confidence: row.discoveryConfidence,
          foundVia: row.foundVia,
        },
        research: row.research,
        score: row.score,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `salespilot-results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={embedded ? "text-slate-950" : "min-h-screen bg-[#f7f9fd] text-slate-950"}>
      {!embedded ? <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-950 text-sm text-white">SP</span>
            SalesPilot
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="hidden sm:inline">Akıllı lead çalışma alanı</span>
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Sistem hazır
          </div>
        </div>
      </header> : null}

      <div className={embedded ? "" : "mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10"}>
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Yeni tarama</p>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Doğru şirketleri bulun.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Hedefinizi tanımlayın; SalesPilot şirketleri bulsun, alıcı rolünü doğrulasın ve kanıta dayalı puanlasın.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 font-semibold text-blue-700">1</span>
            Hedefle <span className="text-slate-300">→</span> Doğrula <span className="text-slate-300">→</span> Puanla
          </div>
        </div>

      <form onSubmit={handleSearch} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_-36px_rgba(15,23,42,.35)] sm:p-7">
        <div className="mb-6 border-b border-slate-100 pb-5">
          <h2 className="font-semibold tracking-tight">Arama profili</h2>
          <p className="mt-1 text-sm text-slate-500">Net bilgi, daha az gürültü ve daha yüksek eşleşme kalitesi sağlar.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="field-label">Kendi şirketiniz</label>
            <input
              className="field-input"
              placeholder="Örn. Turpack"
              value={userCompanyName}
              onChange={(e) => setUserCompanyName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label">Web siteniz</label>
            <input
              className="field-input"
              placeholder="https://..."
              value={userWebsite}
              onChange={(e) => setUserWebsite(e.target.value)}
              required
            />
          </div>
          <div>
          <label className="field-label">Hedef sektör</label>
          <input
            className="field-input"
            placeholder="örn. Gıda üreticileri"
            value={targetSector}
            onChange={(e) => setTargetSector(e.target.value)}
            required
          />
          </div>

          <div>
          <label className="field-label">Hedef bölge</label>
          <input
            className="field-input"
            placeholder="örn. Bursa"
            value={targetRegion}
            onChange={(e) => setTargetRegion(e.target.value)}
            required
          />
          </div>

          <div>
          <label className="field-label">Sunduğunuz ürün veya hizmet</label>
          <input
            className="field-input"
            placeholder="örn. Endüstriyel gıda ambalajları"
            value={productOrService}
            onChange={(e) => setProductOrService(e.target.value)}
            required
          />
          </div>

          <div>
          <label className="field-label">Hedef alıcı tipi <span className="font-normal text-slate-400">— isteğe bağlı</span></label>
          <input
            className="field-input"
            placeholder="Örn. aktif üretim yapan son kullanıcı"
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
          />
          <p className="mt-1.5 text-xs leading-5 text-slate-400">
            Satıcı, rakip veya entegratörlerin elenmesi için gerçek alıcı rolünü yazın.
          </p>
          </div>

          <div className="md:col-span-2">
          <label className="field-label">Ek kriterler <span className="font-normal text-slate-400">— isteğe bağlı</span></label>
          <input
            className="field-input"
            placeholder="örn. ihracat yapan, üretim tesisi bulunan"
            value={extraCriteria}
            onChange={(e) => setExtraCriteria(e.target.value)}
          />
          </div>

          <div>
          <label className="field-label">Nitelikli lead eşiği</label>
          <input
            type="number"
            min={0}
            max={100}
            className="field-input max-w-32"
            value={scoreThreshold}
            onChange={(e) => setScoreThreshold(Number(e.target.value))}
          />
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-400">Ön eleme sırasında alıcı olmayan şirketler araştırma maliyeti oluşturmadan elenir.</p>
          <button type="submit" disabled={searching} className="primary-button">
            {searching ? "Şirketler aranıyor…" : "Taramayı başlat →"}
          </button>
        </div>
      </form>

      {searchError && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{searchError}</p>
      )}

      {rows.length > 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_-36px_rgba(15,23,42,.35)] sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{rows.length} ön elemeden geçen şirket adayı bulundu.</p>
              {searchSummary && (
                <p className={`mt-1 text-xs ${searchSummary.targetReached ? "text-blue-700" : "text-amber-700"}`}>
                  {searchSummary.targetReached
                    ? `En az ${searchSummary.targetCount} ön aday hedefi karşılandı. Bunlar araştırma sonrası doğrulanacak.`
                    : `Dar sonuç kümesinde ${searchSummary.targetCount} hedefine ulaşılamadı; sahte aday eklenmedi.`}
                  {` ${searchSummary.searchRequests} arama isteği · ${searchSummary.rejectedCount} gürültülü sonuç elendi.`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {rows.some((row) => row.status === "done") && (
                <button
                  onClick={handleExportResults}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700"
                >
                  Sonuçları indir
                </button>
              )}
              <button
                onClick={handleProcessAll}
                disabled={processing}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {processing ? "İşleniyor..." : "Tümünü Araştır ve Puanla"}
              </button>
            </div>
          </div>

          <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {rows.map((row) => (
              <li key={row.domain} className="p-5 transition-colors hover:bg-slate-50/70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {row.title}
                    </a>
                    <p className="text-sm text-neutral-500">{row.domain}</p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Keşif güveni: {row.discoveryConfidence === "high" ? "yüksek" : "orta"}
                      {row.foundVia.length > 1 ? ` · ${row.foundVia.length} sorguda bulundu` : ""}
                    </p>
                    {row.status === "done" && row.research && (
                      <div className="mt-1 space-y-1 text-xs">
                        <p className="text-neutral-600">
                          {BUYER_ROLE_LABELS[row.research.buyerRole]} · Kimlik güveni: {row.research.identityConfidence}
                        </p>
                        <p>
                          {row.research.contactEmails.length > 0 ? (
                            <span className="text-blue-700">
                              ✉ {row.research.contactEmails[0].email}
                              <span className="text-neutral-400"> ({row.research.contactEmails[0].sourcePath}, domain doğrulandı)</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400">✉ Doğrulanmış kurumsal e-posta bulunamadı</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <button type="button" onClick={() => handleSaveLead(row)} className={`mb-3 ml-auto grid h-8 w-8 place-items-center rounded-lg border transition ${savedDomains.has(row.domain) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400 hover:bg-slate-50"}`} aria-label={savedDomains.has(row.domain) ? "Kayıttan kaldır" : "Lead'i kaydet"} title={savedDomains.has(row.domain) ? "Kayıttan kaldır" : "Lead'i kaydet"}>
                      <Bookmark className="h-4 w-4" fill={savedDomains.has(row.domain) ? "currentColor" : "none"} />
                    </button>
                    {row.status === "idle" && (
                      <span className="text-xs text-neutral-400">Bekliyor</span>
                    )}
                    {(row.status === "researching" || row.status === "scoring") && (
                      <span className="text-xs text-blue-500">
                        {row.status === "researching" ? "Araştırılıyor..." : "Puanlanıyor..."}
                      </span>
                    )}
                    {row.status === "error" && (
                      <span className="text-xs text-red-600">{row.errorMessage}</span>
                    )}
                    {row.status === "done" && row.score && (
                      <div className="space-y-1">
                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          row.score.reviewStatus === "qualified"
                            ? "bg-green-100 text-green-700"
                            : row.score.reviewStatus === "needs_research"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-neutral-100 text-neutral-600"
                        }`}>
                          {row.score.totalScore} / 100
                        </span>
                        <p className="text-xs text-neutral-500">
                          {REVIEW_STATUS_LABELS[row.score.reviewStatus]} · Kanıt %{row.score.evidenceConfidence}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {row.status === "done" && row.score && row.score.isPlausibleLead === false && (
                  <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ⚠ Muhtemelen uygun bir lead değil: {row.score.leadViabilityReason}
                  </p>
                )}

                {row.status === "done" && row.score?.reviewStatus === "needs_research" && (
                  <p className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    ℹ Bu şirket uygunsuz sayılmadı; güvenilir karar için yeterli kanıt toplanamadı.
                  </p>
                )}

                {row.status === "done" && row.score && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-neutral-500">
                      Puan gerekçesini gör
                    </summary>
                    <ul className="mt-2 space-y-1 text-neutral-700">
                      <li>
                        Sektör uyumu: {row.score.sectorFit.awardedPoints}/
                        {row.score.sectorFit.maxPoints} — {row.score.sectorFit.reasoning}
                      </li>
                      <li>
                        Bölge uyumu: {row.score.regionFit.awardedPoints}/
                        {row.score.regionFit.maxPoints} — {row.score.regionFit.reasoning}
                      </li>
                      <li>
                        Ürün/Hizmet uyumu: {row.score.productFit.awardedPoints}/
                        {row.score.productFit.maxPoints} — {row.score.productFit.reasoning}
                      </li>
                      {row.score.extraCriteria.map((c, i) => (
                        <li key={i}>
                          {c.criterion}: {c.awardedPoints}/{c.maxPoints} — {c.reasoning}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* Faz 4: Mail oluşturma + onay - sadece nitelikli lead'ler için */}
                {row.status === "done" && row.score?.qualified && isOptedOut(row.domain) && (
                  <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
                    🚫 Bu şirket iletişimi durdurmuş (ret etti). Mail taslağı oluşturulamaz.
                  </p>
                )}

                {row.status === "done" && row.score?.qualified && !isOptedOut(row.domain) && (
                  <div className="mt-3 rounded-md border border-neutral-200 p-3">
                    {row.emailStatus === "idle" && (
                      <button
                        onClick={() => handleDraftEmail(row)}
                        disabled={row.research!.contactEmails.length === 0}
                        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                        title={
                          row.research!.contactEmails.length === 0
                            ? "E-posta adresi bulunamadığı için taslak oluşturulamıyor"
                            : undefined
                        }
                      >
                        ✉ E-posta Oluştur
                      </button>
                    )}

                    {row.emailStatus === "drafting" && (
                      <p className="text-sm text-blue-500">Taslak hazırlanıyor...</p>
                    )}

                    {row.emailStatus === "error" && (
                      <div>
                        <p className="text-sm text-red-600">{row.emailError}</p>
                        <button
                          onClick={() => handleDraftEmail(row)}
                          className="mt-2 text-sm text-blue-600 hover:underline"
                        >
                          Tekrar dene
                        </button>
                      </div>
                    )}

                    {(row.emailStatus === "ready" ||
                      row.emailStatus === "approved" ||
                      row.emailStatus === "sending" ||
                      row.emailStatus === "sent") &&
                      row.emailDraft && (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-neutral-500">
                              Alıcı
                            </label>
                            <p className="text-sm">{row.research!.contactEmails[0]?.email}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-500">
                              Konu
                            </label>
                            <input
                              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                              value={row.emailDraft.subject}
                              onChange={(e) =>
                                handleEditDraft(row, { subject: e.target.value })
                              }
                              disabled={row.emailStatus !== "ready"}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-500">
                              Mail
                            </label>
                            <textarea
                              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
                              rows={6}
                              value={row.emailDraft.body}
                              onChange={(e) => handleEditDraft(row, { body: e.target.value })}
                              disabled={row.emailStatus !== "ready"}
                            />
                          </div>

                          {row.emailStatus === "ready" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(row)}
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
                              >
                                Onayla
                              </button>
                              <button
                                onClick={() => handleOptOut(row)}
                                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
                              >
                                Ret Etti / İletişimi Durdur
                              </button>
                            </div>
                          )}

                          {row.emailStatus === "approved" && (
                            <div>
                              <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
                                ✓ Onaylandı ({new Date(row.emailDraft.approvedAt!).toLocaleString("tr-TR")})
                              </p>
                              {row.sendError && (
                                <p className="mt-2 text-sm text-red-600">{row.sendError}</p>
                              )}
                              <button
                                onClick={() => handleSendEmail(row)}
                                className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
                              >
                                {row.sendError ? "Tekrar Dene" : "📤 Gönder"}
                              </button>
                            </div>
                          )}

                          {row.emailStatus === "sending" && (
                            <p className="text-sm text-blue-500">Gönderiliyor...</p>
                          )}

                          {row.emailStatus === "sent" && (
                            <div className="space-y-2">
                              <p
                                className={`rounded-md px-3 py-2 text-xs ${
                                  row.sentTestMode
                                    ? "bg-amber-50 text-amber-800"
                                    : "bg-blue-50 text-blue-800"
                                }`}
                              >
                                {row.sentTestMode
                                  ? `🧪 TEST MODUNDA gönderildi (${new Date(row.sentAt!).toLocaleString("tr-TR")}) - kendi test adresinize gitti, gerçek şirkete gitmedi.`
                                  : `✓ Gerçekten gönderildi (${new Date(row.sentAt!).toLocaleString("tr-TR")})`}
                              </p>
                              <div>
                                <label className="block text-xs font-medium text-neutral-500">
                                  Cevap durumu (manuel güncelleyin)
                                </label>
                                <select
                                  className="mt-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                                  value={row.replyStatus ?? "beklemede"}
                                  onChange={(e) =>
                                    handleReplyStatusChange(row, e.target.value as ReplyStatus)
                                  }
                                >
                                  {Object.entries(REPLY_STATUS_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                onClick={() => handleOptOut(row)}
                                className="text-xs text-neutral-500 hover:underline"
                              >
                                Ret Etti / İletişimi Durdur
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </main>
  );
}

const proofItems = [
  ["01", "Keşfeder", "Farklı arama yollarıyla hedef pazardaki gerçek şirketleri bulur."],
  ["02", "Doğrular", "Satıcıları, rakipleri ve ilgisiz sonuçları araştırmadan önce eler."],
  ["03", "Puanlar", "Her eşleşmeyi açık gerekçeler ve doğrulanabilir kanıtlarla değerlendirir."],
];

const capabilityItems = [
  { icon: Database, title: "Dağınık sonuç değil, temiz hedef havuzu", text: "Farklı sorguları tek bir aday havuzunda birleştirir; dizinleri, yinelenen kayıtları ve ilgisiz sayfaları ayıklar." },
  { icon: ShieldCheck, title: "Her puanın arkasında kanıt", text: "Şirket sitesi, faaliyet alanı, alıcı rolü ve bölge sinyalleri doğrulanmadan yüksek puan verilmez." },
  { icon: Workflow, title: "Araştırmadan aksiyona tek akış", text: "Lead'i kaydedin, gerekçesini inceleyin, iletişim taslağını onaylayın ve sonucu takip edin." },
];

const blogPosts = [
  { category: "Hedefleme", title: "Doğru B2B hedef kitle nasıl belirlenir?", text: "Sektör, bölge ve ürün bilgisini gerçek bir alıcı profiline dönüştürmenin temel adımları.", readTime: "6 dk" },
  { category: "Satış zekâsı", title: "Şirket listesi değil, satış kararı", text: "Kalabalık aday listeleri yerine kanıta dayalı ve harekete geçirilebilir fırsatlar oluşturmak.", readTime: "5 dk" },
  { category: "Yapay zekâ", title: "Lead puanı ne zaman güvenilirdir?", text: "Bir puanın arkasında hangi verilerin, kontrollerin ve insan değerlendirmesinin bulunması gerekir?", readTime: "7 dk" },
];

export default function Home() {
  return (
    <main className="marketing-page min-h-screen overflow-hidden bg-[#f7f9fd] text-[#0f172a]">
      <MarketingHeader />

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-32 lg:pt-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-900/10 bg-white px-3 py-1.5 text-xs font-medium text-blue-900 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Yapay zekâ destekli B2B satış zekâsı
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[72px]">
            Ekibiniz araştırmaya değil, <span className="text-[#2563eb]">satışa zaman ayırsın.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            SalesPilot hedef pazarınızı tarar, gerçek alıcıları doğrular ve ekibinizin harekete geçebileceği nitelikli fırsatlara dönüştürür.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/kayit?plan=demo" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:-translate-y-0.5 hover:bg-blue-700">
              Ücretsiz demo başlat →
            </Link>
            <a href="#vitrin" className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">Ürünü keşfet</a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-12 -z-10 rounded-full bg-[#dbeafe] blur-3xl" />
          <div className="rotate-[1.5deg] rounded-[28px] border border-white/80 bg-[#071b3c] p-3 shadow-[0_35px_90px_-35px_rgba(10,45,32,.55)]">
            <div className="rounded-[20px] bg-[#f9faf8] p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Son tarama</p><p className="mt-1 font-semibold">Türkiye · Gıda üreticileri</p></div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Tamamlandı</span>
              </div>
              <div className="grid grid-cols-3 gap-3 py-5">
                {[["50", "aday"], ["18", "nitelikli"], ["36%", "eşleşme"]].map(([value, label]) => <div key={label} className="rounded-xl bg-white p-4 shadow-sm"><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}
              </div>
              {[92, 87, 81].map((score, index) => <div key={score} className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{["AK", "DN", "MS"][index]}</span><div className="min-w-0 flex-1"><div className="h-2.5 w-2/3 rounded bg-slate-200"/><div className="mt-2 h-2 w-1/3 rounded bg-slate-100"/></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">{score}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="vitrin" className="border-y border-blue-100 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><ProductStory /></div>
      </section>

      <section id="urun" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">Alıcı zekâsı</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Listenin ötesinde bir karar sistemi.</h2></div>
          <p className="max-w-2xl text-base leading-8 text-slate-500">SalesPilot yalnızca şirket isimleri toplamaz. Hangi şirketin neden gerçek bir fırsat olduğunu, hangi kanıta dayandığını ve nerede insan kontrolü gerektiğini gösterir.</p>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">{capabilityItems.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-blue-950/10 bg-white p-7 shadow-[0_20px_50px_-40px_rgba(16,50,36,.45)]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-800"><Icon className="h-5 w-5"/></span><h3 className="mt-8 text-xl font-semibold tracking-tight">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{text}</p></article>)}</div>
      </section>

      <section id="nasil-calisir" className="border-y border-blue-950/10 bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:gap-20 lg:px-8">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">Nasıl çalışır?</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Aramadan karara,<br/>tek bir akış.</h2>
            <p className="mt-6 max-w-md leading-7 text-slate-500">Klasik listeler şirket adı verir. SalesPilot ise o şirketin gerçekten alıcı olup olmadığını açıklayan bir karar zemini oluşturur.</p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {proofItems.map(([number, title, text]) => (
              <article key={number} className="grid gap-4 py-7 sm:grid-cols-[3rem_10rem_1fr] sm:items-start sm:gap-5">
                <span className="text-xs font-semibold tracking-[.12em] text-blue-700">{number}</span>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
                <p className="text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#eff6ff] py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">Neden farklı?</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Yapay zekâ karar verirken nedenini de gösterir.</h2><p className="mt-5 max-w-xl leading-7 text-slate-500">Eksik veriye yüksek puan vermek yerine belirsizliği görünür kılar. Böylece satış ekibi kara kutu puanlara değil, incelenebilir kanıtlara göre hareket eder.</p></div>
          <div className="rounded-2xl border border-blue-950/10 bg-white p-6 sm:p-8">{["Alıcı rolü doğrulaması", "Rakip ve tedarikçi elemesi", "Kaynak bağlantılı puan gerekçesi", "Düşük güvenli sonuçlarda insan incelemesi", "İletişim öncesinde açık kullanıcı onayı"].map((item) => <p key={item} className="flex items-center gap-3 border-b border-slate-100 py-4 text-sm font-medium text-slate-700 last:border-0"><CheckCircle2 className="h-5 w-5 shrink-0 text-blue-700"/>{item}</p>)}</div>
        </div>
      </section>

      <section id="neden" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="rounded-2xl bg-[#071b3c] px-6 py-14 text-center text-white sm:px-12"><p className="text-sm text-blue-200">Satış araştırmasını yeniden düşünün.</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Ekibiniz araştırmaya değil, satışa zaman ayırsın.</h2><Link href="/kayit?plan=demo" className="mt-8 inline-flex rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-[#071b3c]">Ücretsiz demo başlat →</Link></div></section>

      <section className="border-t border-slate-200 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-700">Blog</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Satışa dair daha net fikirler.</h2></div>
            <Link href="/blog" className="text-sm font-semibold text-blue-700 transition hover:text-blue-900">Tüm yazıları gör →</Link>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {blogPosts.map((post, index) => (
              <Link key={post.title} href="/blog" className="group flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-[#f8faff] p-7 transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-[0_24px_60px_-45px_rgba(37,99,235,.55)]">
                <div className="flex items-center justify-between text-xs"><span className="font-semibold uppercase tracking-[.14em] text-blue-700">{post.category}</span><span className="text-slate-400">{post.readTime}</span></div>
                <h3 className="mt-10 text-xl font-semibold leading-7 tracking-tight text-slate-950">{post.title}</h3>
                <p className="mt-4 text-sm leading-6 text-slate-500">{post.text}</p>
                <span className="mt-auto pt-8 text-sm font-semibold text-slate-700 transition group-hover:text-blue-700">Yazıyı oku <span aria-hidden="true">→</span></span>
                <span className="sr-only">Blog yazısı {index + 1}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8"><div><p className="text-lg font-semibold text-slate-900">SalesPilot</p><p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Doğru şirketi keşfedin, kanıtlarla değerlendirin ve satış fırsatına dönüştürün.</p></div><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Ürün</p><div className="mt-4 space-y-3 text-sm text-slate-500"><Link className="block hover:text-blue-600" href="/#nasil-calisir">Nasıl çalışır?</Link><Link className="block hover:text-blue-600" href="/fiyatlandirma">Fiyatlandırma</Link><Link className="block hover:text-blue-600" href="/kayit?plan=demo">Ücretsiz demo</Link></div></div><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SalesPilot</p><div className="mt-4 space-y-3 text-sm text-slate-500"><Link className="block hover:text-blue-600" href="/blog">Blog</Link><Link className="block hover:text-blue-600" href="/hakkimizda">Hakkımızda</Link><Link className="block hover:text-blue-600" href="/giris?next=/panel">Giriş yap</Link></div></div></div><div className="border-t border-slate-100"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-6 text-xs text-slate-400 sm:flex-row lg:px-8"><span>© 2026 SalesPilot</span><span>Daha akıllı satış. Daha doğru fırsat.</span></div></div></footer>
    </main>
  );
}
