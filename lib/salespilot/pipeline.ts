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
} from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Hacimli/basit işler için ucuz model. Kalite sorun olursa "claude-sonnet-5"
// ile değiştirin - maliyet farkını göze alarak.
const RESEARCH_MODEL = "claude-haiku-4-5-20251001";
const CRITERIA_MODEL = "claude-haiku-4-5-20251001";
const SCORING_MODEL = "claude-haiku-4-5-20251001";
const EMAIL_MODEL = "claude-haiku-4-5-20251001"; // kalite yetmezse "claude-sonnet-5" deneyin

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
}): Promise<T> {
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

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    return parseJsonResponse<T>(text);
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
): Promise<CompanyResearch> {
  if (pages.length === 0) {
    // Site kazınamadıysa sistem çökmesin, "veri yok" durumunu açıkça işaretle
    return {
      companyName,
      domain,
      summary: "Web sitesinden veri toplanamadı.",
      facts: [],
      contactEmails: emailCandidates, // sayfa metni boş olsa bile mailto linki bulunmuş olabilir
      collectedAt: new Date().toISOString(),
      pagesVisited: [],
      scrapeFailed: true,
    };
  }

  const parsed = await callAnthropicForJson<{
    summary: string;
    facts: CompanyResearch["facts"];
  }>({
    model: RESEARCH_MODEL,
    maxTokens: 2200,
    prompt: buildResearchPrompt(companyName, domain, pages),
  });

  return {
    companyName,
    domain,
    summary: parsed.summary,
    facts: parsed.facts,
    contactEmails: emailCandidates, // AI'dan değil, doğrudan kazımadan geliyor - uydurma yok
    collectedAt: new Date().toISOString(),
    pagesVisited: pages.map((p) => p.path),
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
): Promise<ExtraCriterion[]> {
  if (!scanRequest.extraCriteria || scanRequest.extraCriteria.trim().length === 0) {
    return [];
  }

  const parsed = await callAnthropicForJson<{ criteria: ExtraCriterion[] }>({
    model: CRITERIA_MODEL,
    maxTokens: 500,
    prompt: buildCriteriaParsingPrompt(scanRequest),
  });

  return parsed.criteria ?? [];
}

// ---------------------------------------------------------------------
// Adım 2b: Kanıta dayalı puanlama - SABİT rubric ile
// ---------------------------------------------------------------------

export async function scoreCompany(
  research: CompanyResearch,
  scanRequest: ScanRequest,
  extraCriteriaRubric: ExtraCriterion[]
): Promise<ScoreBreakdown> {
  const parsed = await callAnthropicForJson<{
    isPlausibleLead: boolean;
    leadViabilityReason: string;
    sectorFit: CriterionScore;
    regionFit: CriterionScore;
    productFit: CriterionScore;
    extraCriteria: CriterionScore[];
  }>({
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

  return {
    ...parsed,
    totalScore,
    qualified: totalScore >= scanRequest.scoreThreshold,
  };
}

// ---------------------------------------------------------------------
// Adım 3: E-posta taslağı (yalnızca nitelikli lead'ler için çağrılmalı)
// ---------------------------------------------------------------------

export async function draftEmail(
  research: CompanyResearch,
  scanRequest: ScanRequest,
  senderCompanyName: string
): Promise<EmailDraft> {
  const verifiedSnippets = research.facts
    .filter((f) => f.status === "verified")
    .map((f) => f.sourceSnippet ?? f.claim);

  const parsed = await callAnthropicForJson<{
    subject: string;
    body: string;
    basedOnFacts: string[];
  }>({
    model: EMAIL_MODEL,
    maxTokens: 800,
    prompt: buildEmailPrompt(research, verifiedSnippets, scanRequest, senderCompanyName),
  });

  return {
    leadId: "", // çağıran kod dolduracak
    subject: parsed.subject,
    body: parsed.body,
    basedOnFacts: parsed.basedOnFacts,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------
// Uçtan uca örnek kullanım
// ---------------------------------------------------------------------

export async function processOneCompany(
  companyName: string,
  domain: string,
  pages: ScrapedPage[],
  scanRequest: ScanRequest,
  extraCriteriaRubric: ExtraCriterion[],
  senderCompanyName: string
) {
  const research = await researchCompany(companyName, domain, pages);
  const score = await scoreCompany(research, scanRequest, extraCriteriaRubric);

  // Sadece nitelikli lead'ler için mail taslağı üret (maliyet + gereksizlik)
  const email = score.qualified
    ? await draftEmail(research, scanRequest, senderCompanyName)
    : null;

  return { research, score, email };
}
