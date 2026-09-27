import { db } from "@/lib/db/client";
import { aiUsageLogs, scanErrors } from "@/lib/db/schema";
import { calculateUsageCost } from "./pricing";

/**
 * SalesPilot - Ölçüm Yardımcıları
 *
 * Prompt şablonları veya puanlama cetveli değiştiğinde bu iki sabiti
 * ARTIRIN - aksi halde eski/yeni tarama sonuçları yanlışlıkla karşılaştırılır
 * (bkz. proje kökündeki 28 Eylül 2026 tarihli ölçüm sistemi tasarımı).
 */
export const PROMPT_VERSION = "prompts_v1";
export const SCORING_VERSION = "rubric_v1";

export interface DeploymentMetadata {
  gitBranch: string | null;
  gitCommitSha: string | null;
  vercelDeploymentId: string | null;
}

export function getDeploymentMetadata(): DeploymentMetadata {
  return {
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    vercelDeploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_URL ?? null,
  };
}

// API anahtarları/token'lar yanlışlıkla hata mesajına sızmışsa (örn. bir
// HTTP kütüphanesi isteği hata mesajına gömüyorsa) veritabanına yazılmadan
// önce temizlenir.
const SECRET_PATTERNS = [/sk-ant-[a-zA-Z0-9-_]+/g, /Bearer [a-zA-Z0-9-_.]+/g];

export function sanitizeErrorMessage(err: unknown): string {
  let message = err instanceof Error ? err.message : String(err);
  for (const pattern of SECRET_PATTERNS) {
    message = message.replace(pattern, "[REDACTED]");
  }
  return message.slice(0, 2000);
}

export interface AiUsageParams {
  scanId: string;
  companyId?: string | null;
  purpose:
    | "target_profile_generation"
    | "query_generation"
    | "company_research"
    | "role_classification"
    | "criteria_generation"
    | "company_scoring"
    | "email_drafting";
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number | null;
  cacheReadInputTokens?: number | null;
  durationMs: number;
}

export async function recordAiUsage(params: AiUsageParams): Promise<void> {
  const cost = calculateUsageCost(params.modelName, params.inputTokens, params.outputTokens);
  await db.insert(aiUsageLogs).values({
    scanId: params.scanId,
    companyId: params.companyId ?? null,
    purpose: params.purpose,
    modelName: params.modelName,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cacheCreationInputTokens: params.cacheCreationInputTokens ?? null,
    cacheReadInputTokens: params.cacheReadInputTokens ?? null,
    inputCostUsd: cost.inputCostUsd.toFixed(6),
    outputCostUsd: cost.outputCostUsd.toFixed(6),
    totalCostUsd: cost.totalCostUsd.toFixed(6),
    durationMs: params.durationMs,
  });
}

export interface ScanErrorParams {
  scanId: string;
  companyId?: string | null;
  queryId?: string | null;
  stage: string;
  errorCode?: string | null;
  error: unknown;
  retryable?: boolean;
  attemptNumber?: number;
  retryReason?: string | null;
  retryDelayMs?: number | null;
  finalStatus: string;
}

export async function recordScanError(params: ScanErrorParams): Promise<void> {
  await db.insert(scanErrors).values({
    scanId: params.scanId,
    companyId: params.companyId ?? null,
    queryId: params.queryId ?? null,
    stage: params.stage,
    errorCode: params.errorCode ?? null,
    safeErrorMessage: sanitizeErrorMessage(params.error),
    retryable: params.retryable ?? false,
    attemptNumber: params.attemptNumber ?? 1,
    retryReason: params.retryReason ?? null,
    retryDelayMs: params.retryDelayMs ?? null,
    finalStatus: params.finalStatus,
  });
}
