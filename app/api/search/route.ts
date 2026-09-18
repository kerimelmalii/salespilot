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

async function searchOneQuery(
  query: string,
  apiKey: string,
  locale: { gl: string; hl: string }
): Promise<SerperOrganicResult[]> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: locale.gl, hl: locale.hl, num: 20 }),
  });
  if (!response.ok) {
    throw new Error(`Serper API hatası: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return (data.organic ?? []) as SerperOrganicResult[];
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
  const fallbackQueries = buildSearchQueries(body);
  const queries = await generateDiscoveryQueries(
    body,
    { language: locale.hl, nativeRegion: locale.nativeRegion, siteSuffix: locale.siteSuffix },
    fallbackQueries
  );
  const rawByDomain = new Map<string, RawCandidate>();

  // Sorgular hedef ülkenin Google pazarı ve diliyle çalışır. Türkçe arayüz
  // kullanmak artık tüm aramaları Türkiye sonuçlarına kilitlemez.
  for (const query of queries) {
    let results: SerperOrganicResult[] = [];
    try { results = await searchOneQuery(query, apiKey, locale); }
    catch (err) { console.error(`Arama sorgusu başarısız: "${query}"`, err); continue; }

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

  return NextResponse.json({
    queries,
    searchLocale: { gl: locale.gl, hl: locale.hl, region: locale.nativeRegion },
    totalFound: companies.length,
    rejectedCount: rejected.length,
    companies,
  });
}
