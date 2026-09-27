import { NextRequest, NextResponse } from "next/server";
import { scrapeCompanyPages } from "@/lib/salespilot/scraping";
import { researchCompany } from "@/lib/salespilot/pipeline";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db/client";
import { evidenceRecords, contactEmails } from "@/lib/db/schema";
import { recordAiUsage, recordScanError } from "@/lib/salespilot/measurement";

interface ResearchRequestBody {
  scanId: string;
  companyId: string;
  companyName: string;
  domain: string;
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`research:${getClientIp(req)}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek. Bir dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY tanımlı değil. .env.local dosyasını kontrol edin." },
      { status: 500 }
    );
  }

  let body: ResearchRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  if (!body.scanId || !body.companyId || !body.companyName || !body.domain) {
    return NextResponse.json(
      { error: "scanId, companyId, companyName ve domain zorunlu." },
      { status: 400 }
    );
  }

  try {
    const { pages, emailCandidates } = await scrapeCompanyPages(body.domain);
    const { research, usage } = await researchCompany(
      body.companyName,
      body.domain,
      pages,
      emailCandidates
    );

    if (usage) {
      await recordAiUsage({
        scanId: body.scanId,
        companyId: body.companyId,
        purpose: "company_research",
        modelName: usage.modelName,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheCreationInputTokens: usage.cacheCreationInputTokens,
        cacheReadInputTokens: usage.cacheReadInputTokens,
        durationMs: usage.durationMs,
      });
    }

    if (research.facts.length > 0) {
      await db.insert(evidenceRecords).values(
        research.facts.map((fact) => ({
          scanId: body.scanId,
          companyId: body.companyId,
          evidenceType: "research_fact",
          sourceUrl: fact.sourcePage ? `https://${body.domain}${fact.sourcePage}` : null,
          sourceTitle: fact.sourcePage ?? null,
          evidenceText: fact.sourceSnippet ?? fact.claim,
          supportsCriterion: fact.claim,
          confidence: fact.status,
        }))
      );
    }

    if (research.contactEmails.length > 0) {
      await db.insert(contactEmails).values(
        research.contactEmails.map((c) => ({
          scanId: body.scanId,
          companyId: body.companyId,
          email: c.email,
          sourceUrl: c.sourceUrl,
          sourcePageType: c.sourcePath,
          domainMatchesCompany: c.email.split("@")[1]?.toLowerCase().endsWith(body.domain.toLowerCase()) ?? false,
          verificationStatus: "possible" as const,
        }))
      );
    }

    return NextResponse.json({ research });
  } catch (err) {
    // MVP1 test aşamasındayız - gerçek hata mesajını istemciye de gönderiyoruz
    // ki teşhis kolay olsun. Gerçek müşterilere satarken bunu sadeleştirin.
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error(`Araştırma başarısız: ${body.domain}`, err);
    await recordScanError({
      scanId: body.scanId,
      companyId: body.companyId,
      stage: "research",
      error: err,
      retryable: true,
      finalStatus: "failed",
    });
    return NextResponse.json(
      { error: `Araştırma sırasında hata: ${message}` },
      { status: 500 }
    );
  }
}
