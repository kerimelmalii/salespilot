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
  buildDiscoveryQueriesPrompt,
  buildCriteriaParsingPrompt,
  buildScoringPrompt,
  buildEmailPrompt,
  buildTargetProfilesPrompt,
  type ScrapedPage,
} from "./prompts";
import type { SearchInputs } from "./discovery";
import type {
  CompanyResearch,
  ScoreBreakdown,
  ScanRequest,
  EmailDraft,
  ExtraCriterion,
  ContactEmailCandidate,
  EntityType,
  BuyerRole,
  TernarySignal,
  SellerProfileRequest,
  SellerCompanyAnalysis,
  TargetCustomerProfile,
} from "./types";
import {
  createHardDisqualifiedScore,
  finalizeLeadScore,
  type ModelScore,
} from "./classification";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Hacimli/basit işler için ucuz model. Kalite sorun olursa "claude-sonnet-5"
// ile değiştirin - maliyet farkını göze alarak.
const RESEARCH_MODEL = "claude-haiku-4-5-20251001";
const CRITERIA_MODEL = "claude-haiku-4-5-20251001";
const SCORING_MODEL = "claude-haiku-4-5-20251001";
const EMAIL_MODEL = "claude-haiku-4-5-20251001"; // kalite yetmezse "claude-sonnet-5" deneyin

export async function generateTargetCustomerProfiles(
  input: SellerProfileRequest,
  pages: ScrapedPage[]
): Promise<SellerCompanyAnalysis> {
  const parsed = await callAnthropicForJson<SellerCompanyAnalysis>({
    model: CRITERIA_MODEL,
    maxTokens: 2400,
    prompt: buildTargetProfilesPrompt(input, pages),
  });

  const profiles = (parsed.profiles ?? [])
    .slice(0, 5)
    .map((profile, index): TargetCustomerProfile => ({
      id: `profile_${index + 1}`,
      name: String(profile.name ?? "").trim(),
      targetSector: String(profile.targetSector ?? "").trim(),
      companyType: String(profile.companyType ?? "").trim(),
      targetRegion: String(profile.targetRegion || input.targetRegion).trim(),
      likelyNeed: String(profile.likelyNeed ?? "").trim(),
      fitReason: String(profile.fitReason ?? "").trim(),
      buyingSignals: Array.isArray(profile.buyingSignals)
        ? profile.buyingSignals.filter((item): item is string => typeof item === "string").slice(0, 5)
        : [],
      exclusionRules: Array.isArray(profile.exclusionRules)
        ? profile.exclusionRules.filter((item): item is string => typeof item === "string").slice(0, 4)
        : [],
      extraCriteria: String(profile.extraCriteria ?? "").trim(),
    }))
    .filter((profile) => profile.name && profile.targetSector && profile.companyType);

  if (profiles.length === 0) {
    throw new Error("Güvenilir bir hedef müşteri profili oluşturulamadı.");
  }

  return {
    companySummary: String(parsed.companySummary ?? "").trim(),
    productOrService: String(parsed.productOrService || input.productOrService).trim(),
    valueProposition: String(parsed.valueProposition ?? "").trim(),
    profiles,
  };
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

export async function generateDiscoveryQueries(
  input: SearchInputs,
  locale: { language: string; nativeRegion: string; siteSuffix?: string },
  fallbackQueries: string[]
): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackQueries;
  try {
    const parsed = await callAnthropicForJson<{ queries: string[] }>({
      model: CRITERIA_MODEL,
      maxTokens: 700,
      prompt: buildDiscoveryQueriesPrompt(input, locale),
    });
    const queries = (parsed.queries ?? [])
      .filter((query): query is string => typeof query === "string" && query.trim().length > 4)
      .map((query) => query.replace(/\s+/g, " ").trim());
    // Modelin semantik alt sektör sorgularını deterministik resmî-site
    // sorgularıyla birleştiriyoruz. Böylece model tek bir arama kalıbına
    // sıkışsa bile keşif çeşitliliği kaybolmuyor.
    return queries.length >= 8
      ? Array.from(new Set([...queries, ...fallbackQueries])).slice(0, 16)
      : fallbackQueries;
  } catch (error) {
    console.error("Yerelleştirilmiş sorgular üretilemedi; deterministik sorgular kullanılıyor.", error);
    return fallbackQueries;
  }
}

// ---------------------------------------------------------------------
// Adım 1: Araştırma
// ---------------------------------------------------------------------

export async function researchCompany(
  companyName: string,
  domain: string,
  pages: ScrapedPage[],
  scanRequest: ScanRequest,
  emailCandidates: ContactEmailCandidate[] = []
): Promise<CompanyResearch> {
  if (pages.length === 0) {
    // Site kazınamadıysa sistem çökmesin, "veri yok" durumunu açıkça işaretle
    return {
      companyName,
      domain,
      officialWebsite: "unknown",
      entityType: "unknown",
      buyerRole: "unknown",
      identityConfidence: "low",
      relationshipSignals: {
        sellsSameOffering: "unknown",
        usesOfferingInProductsOrOperations: "unknown",
        relationshipReason: "Web sitesinden veri toplanamadığı için ticari ilişki belirlenemedi.",
        evidenceRefs: [],
      },
      summary: "Web sitesinden veri toplanamadı.",
      facts: [],
      contactEmails: emailCandidates, // sayfa metni boş olsa bile mailto linki bulunmuş olabilir
      collectedAt: new Date().toISOString(),
      pagesVisited: [],
      scrapeFailed: true,
    };
  }

  const parsed = await callAnthropicForJson<{
    canonicalCompanyName: string;
    officialWebsite: TernarySignal;
    entityType: EntityType;
    buyerRole: BuyerRole;
    identityConfidence: "high" | "medium" | "low";
    relationshipSignals: {
      sellsSameOffering: TernarySignal;
      usesOfferingInProductsOrOperations: TernarySignal;
      relationshipReason: string;
      evidenceRefs: string[];
    };
    summary: string;
    facts: CompanyResearch["facts"];
  }>({
    model: RESEARCH_MODEL,
    maxTokens: 2200,
    prompt: buildResearchPrompt(companyName, domain, pages, scanRequest),
  });

  return {
    companyName: parsed.canonicalCompanyName?.trim() || companyName,
    domain,
    officialWebsite: parsed.officialWebsite ?? "unknown",
    entityType: parsed.entityType ?? "unknown",
    buyerRole: parsed.buyerRole ?? "unknown",
    identityConfidence: parsed.identityConfidence ?? "low",
    relationshipSignals: parsed.relationshipSignals ?? {
      sellsSameOffering: "unknown",
      usesOfferingInProductsOrOperations: "unknown",
      relationshipReason: "Ticari ilişki belirlenemedi.",
      evidenceRefs: [],
    },
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
  // Kesin rakip/dizin/hariç rol için ikinci bir model çağrısı para ve zaman
  // israfıdır. Araştırma kanıtı yeterliyse sonucu deterministik üretiriz.
  const hardDisqualified = createHardDisqualifiedScore(
    research,
    scanRequest,
    extraCriteriaRubric
  );
  if (hardDisqualified) return hardDisqualified;

  const parsed = await callAnthropicForJson<ModelScore>({
    model: SCORING_MODEL,
    maxTokens: 2000,
    prompt: buildScoringPrompt(research, scanRequest, extraCriteriaRubric),
  });

  return finalizeLeadScore(parsed, research, scanRequest);
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
  const research = await researchCompany(companyName, domain, pages, scanRequest);
  const score = await scoreCompany(research, scanRequest, extraCriteriaRubric);

  // Sadece nitelikli lead'ler için mail taslağı üret (maliyet + gereksizlik)
  const email = score.qualified
    ? await draftEmail(research, scanRequest, senderCompanyName)
    : null;

  return { research, score, email };
}
