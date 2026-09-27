"use client";

import { useState } from "react";
import type {
  CompanyResearch,
  ScoreBreakdown,
  ScanRequest,
  ExtraCriterion,
  EmailDraft,
} from "@/lib/salespilot/types";
import { isOptedOut, markOptedOut } from "@/lib/opt-out";

interface CompanyCandidate {
  id: string; // company_candidates.id - ölçüm tablolarına yazarken kullanılır
  domain: string;
  title: string;
  snippet: string;
  url: string;
  foundVia: string[];
}

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

// İnsanın şirket hakkındaki GERÇEK değerlendirmesi ("ground truth") -
// sistemin tahminiyle karşılaştırılarak precision/yanlış pozitif gibi
// kalite metrikleri hesaplanır (bkz. /api/human-review, lib/salespilot/report.ts).
type HumanReviewStatus =
  | "gercek_hedef"
  | "olasi_hedef"
  | "hedef_degil"
  | "dogrudan_rakip"
  | "incelenmesi_gerekiyor";

const HUMAN_REVIEW_LABELS: Record<HumanReviewStatus, string> = {
  gercek_hedef: "Doğru hedef",
  olasi_hedef: "Olası hedef",
  hedef_degil: "Hedef değil",
  dogrudan_rakip: "Rakip",
  incelenmesi_gerekiyor: "Kararsızım",
};

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
  humanReview?: HumanReviewStatus;
}

interface ScanReport {
  totalDurationSeconds: number;
  hamSonucSayisi: number;
  benzersizDomainSayisi: number;
  onFiltredeElenenSayisi: number;
  elenenNedenler: { reason: string; count: number }[];
  arastirilanSirketSayisi: number;
  nitelikliLeadSayisi: number;
  olasiEslesmeSayisi: number;
  reddedilenSayisi: number;
  teknikHataSayisi: number;
  gercekHedefOnaySayisi: number;
  olasiHedefOnaySayisi: number;
  hedefDegilSayisi: number;
  rakipIsaretlenenSayisi: number;
  yanlisPozitif: number | null;
  yanlisNegatif: number | null;
  precision: number | null;
  kanitliSonucOrani: number | null;
  dizinEditoryalOrani: number | null;
  serperIstekSayisi: number;
  anthropicCagriSayisi: number;
  toplamGirdiTokeni: number;
  toplamCiktiTokeni: number;
  toplamMaliyetUsd: number;
  hataSayisi: number;
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
  const [extraCriteria, setExtraCriteria] = useState("");
  const [scoreThreshold, setScoreThreshold] = useState(75);

  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);

  const [report, setReport] = useState<ScanReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  function buildScanRequest(): ScanRequest {
    return {
      userCompanyName,
      userWebsite,
      productOrService,
      targetSector,
      targetRegion,
      extraCriteria,
      scoreThreshold,
    };
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchError(null);
    setSearchNotice(null);
    setRows([]);
    setScanId(null);
    setReport(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildScanRequest()),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Bilinmeyen hata.");
        if (data.scanId) setScanId(data.scanId);
      } else if (data.companies.length === 0) {
        setSearchNotice(
          "Bu kriterlerle hiç şirket bulunamadı. Sektör/bölge/ürün alanlarını genişletip tekrar deneyin."
        );
        setScanId(data.scanId);
      } else {
        setScanId(data.scanId);
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

  function updateRow(id: string, patch: Partial<CompanyRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function processCompany(
    row: CompanyRow,
    scanRequest: ScanRequest,
    extraCriteriaRubric: ExtraCriterion[]
  ) {
    if (!scanId) return;
    updateRow(row.id, { status: "researching", errorMessage: undefined });

    try {
      const researchRes = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          companyId: row.id,
          companyName: row.title,
          domain: row.domain,
        }),
      });
      const researchData = await researchRes.json();
      if (!researchRes.ok) throw new Error(researchData.error ?? "Araştırma hatası");

      updateRow(row.id, { status: "scoring", research: researchData.research });

      const scoreRes = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          companyId: row.id,
          research: researchData.research,
          scanRequest,
          extraCriteriaRubric,
        }),
      });
      const scoreData = await scoreRes.json();
      if (!scoreRes.ok) throw new Error(scoreData.error ?? "Puanlama hatası");

      updateRow(row.id, { status: "done", score: scoreData.score });
    } catch (err) {
      updateRow(row.id, {
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    }
  }

  async function handleProcessAll() {
    if (!scanId) return;
    setProcessing(true);
    const scanRequest = buildScanRequest();

    // Kriterleri BİR KEZ ayrıştırıyoruz - tüm şirketler aynı cetvelle
    // puanlanacak, aksi halde puanlar karşılaştırılamaz hale gelir.
    let extraCriteriaRubric: ExtraCriterion[] = [];
    try {
      const criteriaRes = await fetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scanRequest, scanId }),
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

    // Sırayla işliyoruz (paralel değil) - API maliyetini ve hız limitlerini
    // kontrollü tutmak için. Küçük pilot hacimlerinde bu yeterince hızlı.
    for (const row of rows) {
      await processCompany(row, scanRequest, extraCriteriaRubric);
    }
    setProcessing(false);
  }

  async function handleDraftEmail(row: CompanyRow) {
    if (!row.research || !scanId) return;
    updateRow(row.id, { emailStatus: "drafting", emailError: undefined });

    try {
      const res = await fetch("/api/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId,
          companyId: row.id,
          research: row.research,
          scanRequest: buildScanRequest(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mail taslağı hatası");
      updateRow(row.id, { emailStatus: "ready", emailDraft: data.draft });
    } catch (err) {
      updateRow(row.id, {
        emailStatus: "error",
        emailError: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    }
  }

  function handleEditDraft(row: CompanyRow, patch: Partial<EmailDraft>) {
    if (!row.emailDraft) return;
    updateRow(row.id, { emailDraft: { ...row.emailDraft, ...patch } });
  }

  function handleApprove(row: CompanyRow) {
    if (!row.emailDraft) return;
    // NOT: Bu sadece "onaylandı" olarak işaretliyor, GERÇEKTEN GÖNDERMİYOR.
    // Gerçek gönderim ayrı bir "Gönder" adımı - aşağıdaki handleSendEmail.
    updateRow(row.id, {
      emailStatus: "approved",
      emailDraft: { ...row.emailDraft, approvedAt: new Date().toISOString() },
    });
  }

  async function handleSendEmail(row: CompanyRow) {
    if (!row.emailDraft || !row.research) return;
    const to = row.research.contactEmails[0]?.email;
    if (!to) return;

    updateRow(row.id, { emailStatus: "sending", sendError: undefined });

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject: row.emailDraft.subject, body: row.emailDraft.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gönderim hatası");

      updateRow(row.id, {
        emailStatus: "sent",
        sentAt: data.result.sentAt,
        sentTestMode: data.result.testMode,
        replyStatus: "beklemede",
      });
    } catch (err) {
      // Taslak hâlâ hazır bekliyor - "approved"a geri dönüp tekrar
      // denemeye izin veriyoruz, ayrı bir "error" durumuna geçmiyoruz.
      updateRow(row.id, {
        emailStatus: "approved",
        sendError: err instanceof Error ? err.message : "Bilinmeyen hata",
      });
    }
  }

  function handleReplyStatusChange(row: CompanyRow, status: ReplyStatus) {
    updateRow(row.id, { replyStatus: status });
    // Kullanıcı "İlgilenmiyor" işaretlerse, bunu opt-out ile karıştırmayın -
    // ilgilenmemek ayrı bir şey, ret hakkını kullanmak ayrı. Karışıklık
    // olmasın diye burada otomatik opt-out YAPMIYORUZ, kullanıcı isterse
    // ayrıca "Ret Etti" butonunu kullanır.
  }

  function handleOptOut(row: CompanyRow) {
    markOptedOut(row.domain);
    updateRow(row.id, { emailStatus: "idle", emailDraft: undefined });
    // Yeniden render tetiklemek için rows'u da güncelliyoruz (localStorage
    // React state'i değil, bu yüzden isOptedOut() sonucu otomatik yansımaz).
    setRows((prev) => [...prev]);
  }

  async function handleHumanReview(row: CompanyRow, reviewStatus: HumanReviewStatus) {
    if (!scanId) return;
    // İyimser güncelleme - kullanıcı butona basar basmaz görsün, istek
    // arka planda gider (bkz. /api/human-review, tekil upsert).
    updateRow(row.id, { humanReview: reviewStatus });
    try {
      await fetch("/api/human-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId, companyId: row.id, reviewStatus }),
      });
    } catch (err) {
      console.error("İnsan değerlendirmesi kaydedilemedi", err);
    }
  }

  async function handleShowReport() {
    if (!scanId) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await fetch(`/api/scan-report?scanId=${scanId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rapor alınamadı");
      setReport(data.report);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setReportLoading(false);
    }
  }

  const doneCount = rows.filter((r) => r.status === "done").length;

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

      {searchNotice && (
        <p className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {searchNotice}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">{rows.length} şirket bulundu.</p>
            <button
              onClick={handleProcessAll}
              disabled={processing}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {processing ? "İşleniyor..." : "Tümünü Araştır ve Puanla"}
            </button>
          </div>

          <ul className="mt-4 divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {rows.map((row) => (
              <li key={row.id} className="p-4">
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
                    {row.status === "done" && row.research && (
                      <p className="mt-1 text-xs">
                        {row.research.contactEmails.length > 0 ? (
                          <span className="text-emerald-700">
                            ✉ {row.research.contactEmails[0].email}
                            <span className="text-neutral-400">
                              {" "}
                              ({row.research.contactEmails[0].sourcePath})
                            </span>
                          </span>
                        ) : (
                          <span className="text-neutral-400">✉ E-posta bulunamadı</span>
                        )}
                      </p>
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
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          row.score.qualified
                            ? "bg-green-100 text-green-700"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {row.score.totalScore} / 100
                      </span>
                    )}
                  </div>
                </div>

                {row.status === "done" && row.score && row.score.isPlausibleLead === false && (
                  <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ⚠ Muhtemelen uygun bir lead değil: {row.score.leadViabilityReason}
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
                      <li className="pt-1 text-neutral-500">
                        Ticari rol: {row.score.commercialRole} — {row.score.roleReasoning}
                      </li>
                      <li className="text-neutral-500">
                        Kanıt güveni: {row.score.evidenceConfidence}/100
                      </li>
                    </ul>
                  </details>
                )}

                {row.status === "done" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500">Sizce bu şirket:</span>
                    {(
                      [
                        "gercek_hedef",
                        "olasi_hedef",
                        "hedef_degil",
                        "dogrudan_rakip",
                        "incelenmesi_gerekiyor",
                      ] as HumanReviewStatus[]
                    ).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleHumanReview(row, status)}
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            row.humanReview === status
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          {HUMAN_REVIEW_LABELS[status]}
                        </button>
                      ))}
                  </div>
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

          {doneCount > 0 && scanId && (
            <div className="mt-6 rounded-md border border-neutral-200 p-4">
              <button
                onClick={handleShowReport}
                disabled={reportLoading}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {reportLoading ? "Rapor hazırlanıyor..." : "📊 Tarama Raporu"}
              </button>

              {reportError && (
                <p className="mt-3 text-sm text-red-600">{reportError}</p>
              )}

              {report && (
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <ReportStat label="Ham sonuç" value={report.hamSonucSayisi} />
                  <ReportStat label="Benzersiz domain" value={report.benzersizDomainSayisi} />
                  <ReportStat label="Ön filtrede elenen" value={report.onFiltredeElenenSayisi} />
                  <ReportStat label="Araştırılan şirket" value={report.arastirilanSirketSayisi} />
                  <ReportStat label="Nitelikli lead" value={report.nitelikliLeadSayisi} />
                  <ReportStat label="Olası eşleşme" value={report.olasiEslesmeSayisi} />
                  <ReportStat label="Teknik hata" value={report.teknikHataSayisi} />
                  <ReportStat label="Doğru hedef (kullanıcı)" value={report.gercekHedefOnaySayisi} />
                  <ReportStat label="Olası hedef (kullanıcı)" value={report.olasiHedefOnaySayisi} />
                  <ReportStat
                    label="Precision"
                    value={report.precision !== null ? `%${report.precision.toFixed(1)}` : "—"}
                  />
                  <ReportStat label="Yanlış pozitif" value={report.yanlisPozitif ?? "—"} />
                  <ReportStat label="Yanlış negatif" value={report.yanlisNegatif ?? "—"} />
                  <ReportStat
                    label="Kanıtlı sonuç oranı"
                    value={
                      report.kanitliSonucOrani !== null
                        ? `%${report.kanitliSonucOrani.toFixed(0)}`
                        : "—"
                    }
                  />
                  <ReportStat
                    label="Dizin/editoryal oranı"
                    value={
                      report.dizinEditoryalOrani !== null
                        ? `%${report.dizinEditoryalOrani.toFixed(0)}`
                        : "—"
                    }
                  />
                  <ReportStat label="Serper isteği" value={report.serperIstekSayisi} />
                  <ReportStat label="Anthropic çağrısı" value={report.anthropicCagriSayisi} />
                  <ReportStat
                    label="Toplam token"
                    value={(report.toplamGirdiTokeni + report.toplamCiktiTokeni).toLocaleString("tr-TR")}
                  />
                  <ReportStat
                    label="Tahmini maliyet"
                    value={`$${report.toplamMaliyetUsd.toFixed(4)}`}
                  />
                  <ReportStat
                    label="Toplam süre"
                    value={`${Math.floor(report.totalDurationSeconds / 60)} dk ${report.totalDurationSeconds % 60} sn`}
                  />
                  <ReportStat label="Hata sayısı" value={report.hataSayisi} />
                </dl>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function ReportStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-semibold text-neutral-900">{value}</dd>
    </div>
  );
}
