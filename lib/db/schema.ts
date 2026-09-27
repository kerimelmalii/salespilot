import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * SalesPilot - Ölçüm Şeması
 *
 * Her tarama (scan) tek bir scan_runs satırı olarak açılır; sonraki tüm
 * sorgular, şirketler, model çağrıları, hatalar ve insan değerlendirmeleri
 * bu satırın id'sine (scanId) bağlanır. Bkz. proje kökündeki tasarım notu
 * (28 Eylül 2026 - kalıcı ölçüm sistemi).
 */

// ---- Enum'lar ----

export const generationMethodEnum = pgEnum("generation_method", [
  "ai_generated",
  "deterministic_fallback",
  "manual",
]);

export const exclusionReasonEnum = pgEnum("exclusion_reason", [
  "directory",
  "marketplace",
  "social_network",
  "government",
  "education",
  "editorial_article",
  "listicle",
  "job_page",
  "news_page",
  "invalid_url",
  "duplicate_domain",
  "vendor_excluded",
  "competitor_signal",
  "unverified_company",
  "region_mismatch",
]);

export const locationStatusEnum = pgEnum("location_status", [
  "verified",
  "inferred",
  "unknown",
]);

export const commercialRoleEnum = pgEnum("commercial_role", [
  "end_user",
  "oem",
  "system_integrator",
  "distributor",
  "service_provider",
  "direct_competitor",
  "unknown",
]);

export const sectorMatchClassEnum = pgEnum("sector_match_class", [
  "strong_match",
  "partial_match",
  "mismatch",
  "unknown",
]);

export const buyerStatusEnum = pgEnum("buyer_status", [
  "confirmed_buyer",
  "probable_buyer",
  "possible_buyer",
  "not_buyer",
  "unknown",
]);

export const competitorStatusEnum = pgEnum("competitor_status", [
  "direct_competitor",
  "indirect_competitor",
  "not_competitor",
  "uncertain",
]);

export const decisionStatusEnum = pgEnum("decision_status", [
  "qualified",
  "possible_match",
  "needs_research",
  "rejected",
  "technical_failure",
]);

export const aiUsagePurposeEnum = pgEnum("ai_usage_purpose", [
  "target_profile_generation",
  "query_generation",
  "company_research",
  "role_classification",
  "criteria_generation",
  "company_scoring",
  "email_drafting",
]);

export const emailVerificationStatusEnum = pgEnum("email_verification_status", [
  "verified_domain_match",
  "possible",
  "free_email",
  "third_party",
  "rejected",
]);

// "Gerçek referans etiketi" - insanın şirkete verdiği gerçek karar.
export const humanReviewStatusEnum = pgEnum("human_review_status", [
  "gercek_hedef",
  "olasi_hedef",
  "hedef_degil",
  "dogrudan_rakip",
  "incelenmesi_gerekiyor",
]);

// ---- 1) scan_runs ----

export const scanRuns = pgTable("scan_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  // Sürüm bilgisi - eski/yeni tarama sonuçlarını karşılaştırmak için zorunlu.
  gitBranch: text("git_branch"),
  gitCommitSha: text("git_commit_sha"),
  vercelDeploymentId: text("vercel_deployment_id"),
  promptVersion: text("prompt_version").notNull(),
  scoringVersion: text("scoring_version").notNull(),
  aiModel: text("ai_model").notNull(),

  // Pilot dönemde anonim - gerçek üyelik gelince doldurulur.
  workspaceId: text("workspace_id"),

  // Kullanıcının form girdileri (değiştirilmeden saklanır).
  userCompanyName: text("user_company_name").notNull(),
  userWebsite: text("user_website").notNull(),
  targetSector: text("target_sector").notNull(),
  targetRegion: text("target_region").notNull(),
  productOrService: text("product_or_service").notNull(),
  extraCriteria: text("extra_criteria"),
  scoreThreshold: integer("score_threshold").notNull(),
  excludedRoles: jsonb("excluded_roles").$type<string[]>(),

  // Henüz uygulamada olmayan "5 hedef profil öner" adımı için ayrılmış -
  // bu özellik bugün itibarıyla yok, alanlar boş kalır (gelecekte doldurulur).
  generatedProfiles: jsonb("generated_profiles"),
  selectedProfileIds: jsonb("selected_profile_ids").$type<string[]>(),
  editedProfileContent: jsonb("edited_profile_content"),

  // Aşama süreleri (ms) - serbest biçimli jsonb, her aşama kendi anahtarını yazar.
  // örn. { "queryGenerationMs": 12, "searchMs": 840, "filterMs": 3 }
  stageDurations: jsonb("stage_durations").$type<Record<string, number>>(),
});

// ---- 2) search_queries ----

export const searchQueries = pgTable("search_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scanRuns.id, { onDelete: "cascade" }),
  targetProfileId: text("target_profile_id"),
  queryText: text("query_text").notNull(),
  queryLanguage: text("query_language").notNull().default("tr"),
  googleCountry: text("google_country").notNull().default("tr"),
  googleLanguage: text("google_language").notNull().default("tr"),
  queryOrder: integer("query_order").notNull(),
  generationMethod: generationMethodEnum("generation_method").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 3) search_results (ham sonuçlar + ön filtre eleme bilgisi) ----

export const searchResults = pgTable("search_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scanRuns.id, { onDelete: "cascade" }),
  queryId: uuid("query_id")
    .notNull()
    .references(() => searchQueries.id, { onDelete: "cascade" }),
  resultPosition: integer("result_position").notNull(),
  title: text("title"),
  url: text("url").notNull(),
  snippet: text("snippet"),
  domain: text("domain"),
  // Ön filtrede elendiyse true + eleme nedeni; elenmediyse bir
  // company_candidates satırına dönüşür.
  excluded: boolean("excluded").notNull().default(false),
  exclusionReason: exclusionReasonEnum("exclusion_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 4) company_candidates ----

export const companyCandidates = pgTable("company_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scanRuns.id, { onDelete: "cascade" }),

  searchResultName: text("search_result_name").notNull(),
  verifiedCompanyName: text("verified_company_name"),
  officialDomain: text("official_domain").notNull(),

  // Aynı şirketi bulan tüm sorgu/URL'ler - hangi sorgunun daha kaliteli
  // şirket bulduğunu ölçmek için.
  sourceUrls: jsonb("source_urls").$type<string[]>().notNull(),
  sourceQueryIds: jsonb("source_query_ids").$type<string[]>().notNull(),

  country: text("country"),
  city: text("city"),
  locationStatus: locationStatusEnum("location_status").notNull().default("unknown"),

  commercialRole: commercialRoleEnum("commercial_role").notNull().default("unknown"),
  roleReasoning: text("role_reasoning"),
  roleSourceUrl: text("role_source_url"),
  roleEvidenceText: text("role_evidence_text"),
  roleConfidence: integer("role_confidence"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 5) company_evaluations ----

export const companyEvaluations = pgTable("company_evaluations", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scanRuns.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companyCandidates.id, { onDelete: "cascade" }),

  sectorScore: integer("sector_score").notNull(),
  regionScore: integer("region_score").notNull(),
  buyerNeedScore: integer("buyer_need_score").notNull(),
  extraCriteriaScore: integer("extra_criteria_score").notNull(),
  totalScore: integer("total_score").notNull(),

  sectorMatchClass: sectorMatchClassEnum("sector_match_class").notNull(),
  buyerStatus: buyerStatusEnum("buyer_status").notNull(),
  competitorStatus: competitorStatusEnum("competitor_status").notNull(),
  evidenceConfidence: integer("evidence_confidence").notNull(),
  decisionStatus: decisionStatusEnum("decision_status").notNull(),

  scoringVersion: text("scoring_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 6) evidence_records ----

export const evidenceRecords = pgTable("evidence_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scanRuns.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companyCandidates.id, { onDelete: "cascade" }),

  evidenceType: text("evidence_type").notNull(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  evidenceText: text("evidence_text").notNull(),
  supportsCriterion: text("supports_criterion"),
  confidence: text("confidence"), // "high" | "medium" | "low" (bkz. types.ts VerificationStatus)
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 7) ai_usage_logs ----

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scanRuns.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companyCandidates.id, {
    onDelete: "set null",
  }),

  purpose: aiUsagePurposeEnum("purpose").notNull(),
  modelName: text("model_name").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cacheCreationInputTokens: integer("cache_creation_input_tokens"),
  cacheReadInputTokens: integer("cache_read_input_tokens"),

  inputCostUsd: numeric("input_cost_usd", { precision: 10, scale: 6 }).notNull(),
  outputCostUsd: numeric("output_cost_usd", { precision: 10, scale: 6 }).notNull(),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }).notNull(),

  durationMs: integer("duration_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- 8) scan_errors ----

export const scanErrors = pgTable("scan_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scanRuns.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companyCandidates.id, {
    onDelete: "set null",
  }),
  queryId: uuid("query_id").references(() => searchQueries.id, { onDelete: "set null" }),

  stage: text("stage").notNull(),
  errorCode: text("error_code"),
  safeErrorMessage: text("safe_error_message").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  retryable: boolean("retryable").notNull().default(false),
  attemptNumber: integer("attempt_number").notNull().default(1),
  retryReason: text("retry_reason"),
  retryDelayMs: integer("retry_delay_ms"),
  finalStatus: text("final_status").notNull(),
});

// ---- 9) human_reviews ----

export const humanReviews = pgTable(
  "human_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companyCandidates.id, { onDelete: "cascade" }),

    reviewStatus: humanReviewStatusEnum("review_status").notNull(),
    reasoningText: text("reasoning_text"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Şirket başına TEK bir güncel insan kararı olur - kullanıcı fikrini
    // değiştirirse yeni satır eklemek yerine mevcut kaydı günceller.
    uniqueIndex("human_reviews_scan_company_idx").on(table.scanId, table.companyId),
  ]
);

// ---- Ek: contact_emails (research.contactEmails için kalıcı kayıt) ----

export const contactEmails = pgTable("contact_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => scanRuns.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companyCandidates.id, { onDelete: "cascade" }),

  email: text("email").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourcePageType: text("source_page_type"),
  domainMatchesCompany: boolean("domain_matches_company").notNull().default(false),
  verificationStatus: emailVerificationStatusEnum("verification_status").notNull(),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
});
