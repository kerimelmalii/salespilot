import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  assessOrganicResult,
  buildSearchQueries,
  displayNameFromResult,
  normalizeDomain,
  resolveSearchLocale,
  type SearchInputs,
} from "@/lib/salespilot/discovery";
import type { CompanyCandidate } from "@/lib/salespilot/types";
import { generateDiscoveryQueries } from "@/lib/salespilot/pipeline";

interface SerperOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
}

interface RawCandidate {
  domain: string;
  title: string;
  snippet: string;
  url: string;
  foundVia: string[];
}

export const maxDuration = 60;

const DEFAULT_TARGET_COUNT = 50;
const MAX_TARGET_COUNT = 100;
const SEARCH_PAGE_SIZE = 20;
const MAX_SEARCH_PAGES = 2;
const SEARCH_CONCURRENCY = 4;

function clampTargetCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_TARGET_COUNT;
  return Math.min(MAX_TARGET_COUNT, Math.max(10, Math.round(parsed)));
}

async function searchOneQuery(
  query: string,
  apiKey: string,
  locale: { gl: string; hl: string },
  page: number
): Promise<SerperOrganicResult[]> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      q: query,
      gl: locale.gl,
      hl: locale.hl,
      num: SEARCH_PAGE_SIZE,
      page,
    }),
  });
  if (!response.ok) {
    throw new Error(`Serper API hatası: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return (data.organic ?? []) as SerperOrganicResult[];
}

function acceptedCandidateCount(rawByDomain: Map<string, RawCandidate>): number {
  let count = 0;
  for (const raw of rawByDomain.values()) {
    if (assessOrganicResult({
      title: raw.title,
      url: raw.url,
      domain: raw.domain,
      occurrenceCount: raw.foundVia.length,
    }).accepted) count += 1;
  }
  return count;
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`search:${getClientIp(req)}`, 10, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." }, { status: 429 });
  }

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SERPER_API_KEY tanımlı değil. .env.local dosyasını kontrol edin." }, { status: 500 });
  }

  let body: SearchInputs;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 }); }

  if (!body.targetSector || !body.targetRegion || !body.productOrService) {
    return NextResponse.json({ error: "targetSector, targetRegion ve productOrService zorunlu." }, { status: 400 });
  }

  const locale = resolveSearchLocale(body.targetRegion);
  const targetCount = clampTargetCount(body.targetCount);
  // Araştırma aşamasında elenecek adaylara karşı %40 güvenlik payı toplarız.
  // Dar pazarlarda sahte şirket eklemek yerine gerçek bulunan sayıyı döndürürüz.
  const discoveryPoolTarget = Math.min(MAX_TARGET_COUNT, Math.ceil(targetCount * 1.4));
  const fallbackQueries = buildSearchQueries(body);
  const queries = await generateDiscoveryQueries(
    body,
    { language: locale.hl, nativeRegion: locale.nativeRegion, siteSuffix: locale.siteSuffix },
    fallbackQueries
  );
  const rawByDomain = new Map<string, RawCandidate>();

  function ingest(query: string, results: SerperOrganicResult[]) {
    for (const result of results) {
      if (!result.link) continue;
      const domain = normalizeDomain(result.link);
      if (!domain) continue;
      const existing = rawByDomain.get(domain);
      if (existing) {
        if (!existing.foundVia.includes(query)) existing.foundVia.push(query);
        try {
          const path = new URL(result.link).pathname;
          if (path === "/" || /\/(about|company|unternehmen|impressum|kontakt)\/?$/i.test(path)) {
            existing.url = result.link;
            existing.title = result.title ?? existing.title;
            existing.snippet = result.snippet ?? existing.snippet;
          }
        } catch { /* geçersiz URL yukarıda zaten elenmiştir */ }
      } else {
        rawByDomain.set(domain, {
          domain,
          title: result.title ?? domain,
          snippet: result.snippet ?? "",
          url: result.link,
          foundVia: [query],
        });
      }
    }
  }

  // Adaptif keşif: farklı niyetli sorguların ilk sayfalarını tarar; kaliteli
  // havuz hedefin altında kalırsa aynı sorguların sonraki sayfalarına geçer.
  // Dörderli gruplar hız ile Serper yükü arasında kontrollü denge kurar.
  let pagesSearched = 0;
  outer: for (let page = 1; page <= MAX_SEARCH_PAGES; page += 1) {
    for (let start = 0; start < queries.length; start += SEARCH_CONCURRENCY) {
      const batch = queries.slice(start, start + SEARCH_CONCURRENCY);
      const batchResults = await Promise.all(batch.map(async (query) => {
        try {
          return { query, results: await searchOneQuery(query, apiKey, locale, page) };
        } catch (err) {
          console.error(`Arama sorgusu başarısız: "${query}" (sayfa ${page})`, err);
          return { query, results: [] as SerperOrganicResult[] };
        }
      }));
      batchResults.forEach(({ query, results }) => ingest(query, results));
      pagesSearched += batch.length;
      if (acceptedCandidateCount(rawByDomain) >= discoveryPoolTarget) break outer;
    }
  }

  const rejected: { domain: string; reason: string }[] = [];
  const companies: CompanyCandidate[] = [];
  for (const raw of rawByDomain.values()) {
    const assessment = assessOrganicResult({
      title: raw.title,
      url: raw.url,
      domain: raw.domain,
      occurrenceCount: raw.foundVia.length,
    });
    if (!assessment.accepted) {
      rejected.push({ domain: raw.domain, reason: assessment.reason });
      continue;
    }
    companies.push({
      ...raw,
      title: displayNameFromResult(raw.title, raw.domain),
      discoveryConfidence: assessment.confidence,
      discoveryReason: assessment.reason,
    });
  }

  companies.sort((a, b) => {
    const confidence = Number(b.discoveryConfidence === "high") - Number(a.discoveryConfidence === "high");
    return confidence || b.foundVia.length - a.foundVia.length;
  });

  const limitedCompanies = companies.slice(0, discoveryPoolTarget);

  return NextResponse.json({
    queries,
    searchLocale: { gl: locale.gl, hl: locale.hl, region: locale.nativeRegion },
    targetCount,
    discoveryPoolTarget,
    targetReached: limitedCompanies.length >= targetCount,
    totalFound: limitedCompanies.length,
    totalUniqueDomains: rawByDomain.size,
    searchRequests: pagesSearched,
    rejectedCount: rejected.length,
    companies: limitedCompanies,
  });
}
