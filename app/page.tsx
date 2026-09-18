"use client";

import { useState } from "react";
import type {
  CompanyResearch,
  ScoreBreakdown,
  ScanRequest,
  ExtraCriterion,
  EmailDraft,
  CompanyCandidate,
} from "@/lib/salespilot/types";
import { isOptedOut, markOptedOut } from "@/lib/opt-out";

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
export default function Home() {
  const [userCompanyName, setUserCompanyName] = useState("");
  const [userWebsite, setUserWebsite] = useState("");
  const [targetSector, setTargetSector] = useState("");
  const [targetRegion, setTargetRegion] = useState("");
  const [productOrService, setProductOrService] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [extraCriteria, setExtraCriteria] = useState("");
  const [scoreThreshold, setScoreThreshold] = useState(75);

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
  ) {
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
    } catch (err) {
      updateRow(row.domain, {
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
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
    const workers = Array.from({ length: Math.min(3, rows.length) }, async () => {
      while (cursor < rows.length) {
        const row = rows[cursor];
        cursor += 1;
        // eslint-disable-next-line no-await-in-loop
        await processCompany(row, scanRequest, extraCriteriaRubric);
      }
    });
    await Promise.all(workers);
    setProcessing(false);
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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">SalesPilot — Uçtan Uca Test</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Faz 0/1 test sayfası: ara → araştır → puanla. Nihai tasarım Faz 2&apos;de.
      </p>

      <form onSubmit={handleSearch} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Kendi şirket adınız</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={userCompanyName}
              onChange={(e) => setUserCompanyName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Kendi web siteniz</label>
            <input
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              placeholder="https://..."
              value={userWebsite}
              onChange={(e) => setUserWebsite(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Hedef sektör</label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            placeholder="örn. Gıda üreticileri"
            value={targetSector}
            onChange={(e) => setTargetSector(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Hedef bölge</label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            placeholder="örn. Bursa"
            value={targetRegion}
            onChange={(e) => setTargetRegion(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Ürün/Hizmet</label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            placeholder="örn. Endüstriyel gıda ambalajları"
            value={productOrService}
            onChange={(e) => setProductOrService(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Hedef şirket türü (opsiyonel)</label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            placeholder="örn. OEM makine üreticisi, sistem entegratörü"
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Makine üreticilerinin yanlışlıkla rakip sayılmaması için hedef alıcı rolünü belirtin.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Ek kriterler (opsiyonel)</label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            placeholder="örn. ihracat yapan, üretim tesisi bulunan"
            value={extraCriteria}
            onChange={(e) => setExtraCriteria(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Nitelikli lead eşiği</label>
          <input
            type="number"
            min={0}
            max={100}
            className="mt-1 w-32 rounded-md border border-neutral-300 px-3 py-2"
            value={scoreThreshold}
            onChange={(e) => setScoreThreshold(Number(e.target.value))}
          />
        </div>

        <button
          type="submit"
          disabled={searching}
          className="rounded-md bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {searching ? "Aranıyor..." : "Taramayı Başlat"}
        </button>
      </form>

      {searchError && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{searchError}</p>
      )}

      {rows.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{rows.length} şirket adayı bulundu.</p>
              {searchSummary && (
                <p className={`mt-1 text-xs ${searchSummary.targetReached ? "text-emerald-700" : "text-amber-700"}`}>
                  {searchSummary.targetReached
                    ? `En az ${searchSummary.targetCount} aday hedefi karşılandı.`
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

          <ul className="mt-4 divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {rows.map((row) => (
              <li key={row.domain} className="p-4">
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
                            <span className="text-emerald-700">
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
                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white"
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
                              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
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
                                    : "bg-emerald-50 text-emerald-800"
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
    </main>
  );
}
