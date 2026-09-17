"use client";

import { useState } from "react";
import type {
  CompanyResearch,
  ScoreBreakdown,
  ScanRequest,
  ExtraCriterion,
} from "@/lib/salespilot/types";

interface CompanyCandidate {
  domain: string;
  title: string;
  snippet: string;
  url: string;
  foundVia: string[];
}

type RowStatus = "idle" | "researching" | "scoring" | "done" | "error";

interface CompanyRow extends CompanyCandidate {
  status: RowStatus;
  research?: CompanyResearch;
  score?: ScoreBreakdown;
  errorMessage?: string;
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
    setRows([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSector, targetRegion, productOrService, extraCriteria }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Bilinmeyen hata.");
      } else {
        setRows(
          data.companies.map((c: CompanyCandidate) => ({ ...c, status: "idle" as RowStatus }))
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
        body: JSON.stringify({ companyName: row.title, domain: row.domain }),
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

    // Sırayla işliyoruz (paralel değil) - API maliyetini ve hız limitlerini
    // kontrollü tutmak için. Küçük pilot hacimlerinde bu yeterince hızlı.
    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      await processCompany(row, scanRequest, extraCriteriaRubric);
    }
    setProcessing(false);
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
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
