/**
 * SalesPilot - Örnek Pipeline
 *
 * Bu dosya, prompts.ts'teki şablonları Anthropic API ile nasıl kullanacağınızı
 * gösteren ÇALIŞAN bir örnektir. Kendi /api/research, /api/score, /api/draft-email
 * Next.js route handler'larınızın içine bu mantığı taşıyabilirsiniz.
 *
 * Kurulum: npm install @anthropic-ai/sdk
 * .env.local içine: ANTHROPIC_API_KEY=...
 *
 * Model seçimi (maliyet için önemli - konuştuğumuz nokta):
 * Araştırma ve puanlama gibi hacimli ama "basit sınıflandırma" işlerinde
 * ucuz/hızlı bir model (Haiku 4.5) kullanıyoruz. Sadece kalitenin gerçekten
 * fark yarattığı e-posta taslağı adımında isterseniz daha güçlü bir modele
 * geçebilirsiniz (aşağıda EMAIL_MODEL sabitini değiştirmeniz yeterli).
 *
 * ÖLÇÜM: Her Anthropic çağrısı token/süre bilgisini (AiCallUsage) de
 * döndürür - çağıran route handler bunu scanId/companyId ile birlikte
 * ai_usage_logs tablosuna yazar (bkz. lib/salespilot/measurement.ts).
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  buildResearchPrompt,
  buildCriteriaParsingPrompt,
  buildScoringPrompt,
  buildEmailPrompt,
  type ScrapedPage,
} from "./prompts";
import type {
  CompanyResearch,
  ScoreBreakdown,
  ScanRequest,
  EmailDraft,
  CriterionScore,
  ExtraCriterion,
  ContactEmailCandidate,
  SectorMatchClass,
  BuyerStatus,
  CompetitorStatus,
  CommercialRole,
  DecisionStatus,
} from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Hacimli/basit işler için ucuz model. Kalite sorun olursa "claude-sonnet-5"
// ile değiştirin - maliyet farkını göze alarak.
const RESEARCH_MODEL = "claude-haiku-4-5-20251001";
const CRITERIA_MODEL = "claude-haiku-4-5-20251001";
const SCORING_MODEL = "claude-haiku-4-5-20251001";
const EMAIL_MODEL = "claude-haiku-4-5-20251001"; // kalite yetmezse "claude-sonnet-5" deneyin

export interface AiCallUsage {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number | null;
  cacheReadInputTokens: number | null;
  durationMs: number;
}

/** Model yanıtlarındaki olası ```json çitlerini temizleyip JSON.parse eder. */
function parseJsonResponse<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Anthropic'i çağırıp JSON yanıt bekleyen ortak yardımcı. Model bazen
 * max_tokens sınırına takılıp JSON'ı yarıda kesiyor (özellikle içeriği
 * uzun sitelerde) - bunu stop_reason'dan tespit edip bir kez daha yüksek
 * bütçeyle deniyoruz. Yine de parse edilemezse, route handler'ların zaten
 * yakalayıp kullanıcıya gösterdiği hatayı anlamlı bir mesajla fırlatıyoruz.
 */
async function callAnthropicForJson<T>(params: {
  model: string;
  maxTokens: number;
  prompt: string;
}): Promise<{ data: T; usage: AiCallUsage }> {
  const startedAt = Date.now();
  const call = (maxTokens: number) =>
    anthropic.messages.create({
      model: params.model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: params.prompt }],
    });

  let response = await call(params.maxTokens);

  if (response.stop_reason === "max_tokens") {
    const retryMaxTokens = params.maxTokens * 2;
    console.warn(
      `Model yanıtı max_tokens (${params.maxTokens}) sınırında kesildi, ${retryMaxTokens} ile tekrar deneniyor.`
    );
    response = await call(retryMaxTokens);
  }

  const usage: AiCallUsage = {
    modelName: params.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    // Bu SDK sürümü (0.27.3) prompt caching alanlarını Usage tipinde expose
    // etmiyor ve zaten cache_control kullanmıyoruz - şimdilik hep null.
    cacheCreationInputTokens: null,
    cacheReadInputTokens: null,
    durationMs: Date.now() - startedAt,
  };

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    return { data: parseJsonResponse<T>(text), usage };
  } catch (err) {
    console.error(
      `JSON parse hatası (stop_reason: ${response.stop_reason}). Ham yanıt:`,
      text
    );
    throw new Error(
      `Model yanıtı geçerli JSON olarak ayrıştırılamadı (stop_reason: ${response.stop_reason}).`
    );
  }
}

// ---------------------------------------------------------------------
// Adım 1: Araştırma
// ---------------------------------------------------------------------

export async function researchCompany(
  companyName: string,
  domain: string,
  pages: ScrapedPage[],
  emailCandidates: ContactEmailCandidate[] = []
): Promise<{ research: CompanyResearch; usage: AiCallUsage | null }> {
  if (pages.length === 0) {
    // Site kazınamadıysa sistem çökmesin, "veri yok" durumunu açıkça işaretle
    return {
      research: {
        companyName,
        domain,
        summary: "Web sitesinden veri toplanamadı.",
        facts: [],
        contactEmails: emailCandidates, // sayfa metni boş olsa bile mailto linki bulunmuş olabilir
        collectedAt: new Date().toISOString(),
        pagesVisited: [],
        scrapeFailed: true,
      },
      usage: null,
    };
  }

  const { data: parsed, usage } = await callAnthropicForJson<{
    summary: string;
    facts: CompanyResearch["facts"];
  }>({
    model: RESEARCH_MODEL,
    maxTokens: 2200,
    prompt: buildResearchPrompt(companyName, domain, pages),
  });

  return {
    research: {
      companyName,
      domain,
      summary: parsed.summary,
      facts: parsed.facts,
      contactEmails: emailCandidates, // AI'dan değil, doğrudan kazımadan geliyor - uydurma yok
      collectedAt: new Date().toISOString(),
      pagesVisited: pages.map((p) => p.path),
    },
    usage,
  };
}

// ---------------------------------------------------------------------
// Adım 2a: Ek kriterleri SABİT bir cetvele ayrıştırma - tarama başına BİR KEZ
// ---------------------------------------------------------------------

/**
 * Bunu bir taramada SADECE BİR KEZ çağırın (örn. arama sonuçları geldiğinde),
 * sonucu saklayın ve her scoreCompany() çağrısına AYNI rubric'i verin.
 * Her şirket için yeniden çağırırsanız, kriterler şirketten şirkete
 * farklılaşır ve puanlar karşılaştırılamaz hale gelir (bkz. prompts.ts'teki
 * buildCriteriaParsingPrompt yorumu).
 */
export async function parseExtraCriteria(
  scanRequest: ScanRequest
): Promise<{ rubric: ExtraCriterion[]; usage: AiCallUsage | null }> {
  if (!scanRequest.extraCriteria || scanRequest.extraCriteria.trim().length === 0) {
    return { rubric: [], usage: null };
  }

  const { data: parsed, usage } = await callAnthropicForJson<{ criteria: ExtraCriterion[] }>({
    model: CRITERIA_MODEL,
    maxTokens: 500,
    prompt: buildCriteriaParsingPrompt(scanRequest),
  });

  return { rubric: parsed.criteria ?? [], usage };
}

// ---------------------------------------------------------------------
// Adım 2b: Kanıta dayalı puanlama - SABİT rubric ile
// ---------------------------------------------------------------------

interface RawScoringResponse {
  isPlausibleLead: boolean;
  leadViabilityReason: string;
  sectorFit: CriterionScore;
  regionFit: CriterionScore;
  productFit: CriterionScore;
  extraCriteria: CriterionScore[];
  sectorMatchClass: SectorMatchClass;
  buyerStatus: BuyerStatus;
  competitorStatus: CompetitorStatus;
  evidenceConfidence: number;
  commercialRole: CommercialRole;
  roleReasoning: string;
}

/**
 * totalScore/qualified'dan DecisionStatus türetir. Model bunu doğrudan
 * üretmiyor - kod tarafında tek bir yerde, tutarlı biçimde hesaplanıyor
 * (bkz. proje kökündeki 28 Eylül 2026 ölçüm sistemi tasarımı).
 */
function deriveDecisionStatus(
  isPlausibleLead: boolean,
  qualified: boolean,
  totalScore: number,
  scoreThreshold: number
): DecisionStatus {
  if (!isPlausibleLead) return "rejected";
  if (qualified) return "qualified";
  // Eşiğin en az yarısına ulaştıysa "olası eşleşme", yoksa "daha fazla
  // araştırma gerekiyor" - ikisi de reddedilmiş sayılmaz.
  return totalScore >= scoreThreshold / 2 ? "possible_match" : "needs_research";
}

export async function scoreCompany(
  research: CompanyResearch,
  scanRequest: ScanRequest,
  extraCriteriaRubric: ExtraCriterion[]
): Promise<{ score: ScoreBreakdown; usage: AiCallUsage }> {
  const { data: parsed, usage } = await callAnthropicForJson<RawScoringResponse>({
    model: SCORING_MODEL,
    maxTokens: 2000,
    prompt: buildScoringPrompt(research, scanRequest, extraCriteriaRubric),
  });

  // GÜVENLİK AĞI: Modelin kendi "bu bir rakip/aracı, alıcı değil" tespitiyle
  // çelişip yine de yüksek puan verdiği gözlemlendi (17 Eylül 2026, SaaS
  // testinde). Prompt'a güvenmek yetmiyor - isPlausibleLead: false ise
  // sectorFit/productFit'i kod tarafında da 5 puanla sınırlıyoruz, model ne
  // yazmış olursa olsun.
  const MAX_POINTS_IF_NOT_PLAUSIBLE = 5;
  if (parsed.isPlausibleLead === false) {
    parsed.sectorFit = {
      ...parsed.sectorFit,
      awardedPoints: Math.min(parsed.sectorFit.awardedPoints, MAX_POINTS_IF_NOT_PLAUSIBLE),
    };
    parsed.productFit = {
      ...parsed.productFit,
      awardedPoints: Math.min(parsed.productFit.awardedPoints, MAX_POINTS_IF_NOT_PLAUSIBLE),
    };
  }

  // Toplam skoru modele bırakmıyoruz, kendimiz topluyoruz - tutarlılık için.
  const totalScore =
    parsed.sectorFit.awardedPoints +
    parsed.regionFit.awardedPoints +
    parsed.productFit.awardedPoints +
    parsed.extraCriteria.reduce((sum, c) => sum + c.awardedPoints, 0);

  const qualified = totalScore >= scanRequest.scoreThreshold;

  return {
    score: {
      ...parsed,
      totalScore,
      qualified,
      decisionStatus: deriveDecisionStatus(
        parsed.isPlausibleLead,
        qualified,
        totalScore,
        scanRequest.scoreThreshold
      ),
    },
    usage,
  };
}

// ---------------------------------------------------------------------
// Adım 3: E-posta taslağı (yalnızca nitelikli lead'ler için çağrılmalı)
// ---------------------------------------------------------------------

export async function draftEmail(
  research: CompanyResearch,
  scanRequest: ScanRequest,
  senderCompanyName: string
): Promise<{ draft: EmailDraft; usage: AiCallUsage }> {
  const verifiedSnippets = research.facts
    .filter((f) => f.status === "verified")
    .map((f) => f.sourceSnippet ?? f.claim);

  const { data: parsed, usage } = await callAnthropicForJson<{
    subject: string;
    body: string;
    basedOnFacts: string[];
  }>({
    model: EMAIL_MODEL,
    maxTokens: 800,
    prompt: buildEmailPrompt(research, verifiedSnippets, scanRequest, senderCompanyName),
  });

  return {
    draft: {
      leadId: "", // çağıran kod dolduracak
      subject: parsed.subject,
      body: parsed.body,
      basedOnFacts: parsed.basedOnFacts,
      createdAt: new Date().toISOString(),
    },
    usage,
  };
}
