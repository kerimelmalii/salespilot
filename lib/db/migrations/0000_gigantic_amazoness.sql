CREATE TYPE "public"."ai_usage_purpose" AS ENUM('target_profile_generation', 'query_generation', 'company_research', 'role_classification', 'criteria_generation', 'company_scoring', 'email_drafting');--> statement-breakpoint
CREATE TYPE "public"."buyer_status" AS ENUM('confirmed_buyer', 'probable_buyer', 'possible_buyer', 'not_buyer', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."commercial_role" AS ENUM('end_user', 'oem', 'system_integrator', 'distributor', 'service_provider', 'direct_competitor', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."competitor_status" AS ENUM('direct_competitor', 'indirect_competitor', 'not_competitor', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('qualified', 'possible_match', 'needs_research', 'rejected', 'technical_failure');--> statement-breakpoint
CREATE TYPE "public"."email_verification_status" AS ENUM('verified_domain_match', 'possible', 'free_email', 'third_party', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."exclusion_reason" AS ENUM('directory', 'marketplace', 'social_network', 'government', 'education', 'editorial_article', 'listicle', 'job_page', 'news_page', 'invalid_url', 'duplicate_domain', 'vendor_excluded', 'competitor_signal', 'unverified_company', 'region_mismatch');--> statement-breakpoint
CREATE TYPE "public"."generation_method" AS ENUM('ai_generated', 'deterministic_fallback', 'manual');--> statement-breakpoint
CREATE TYPE "public"."human_review_status" AS ENUM('gercek_hedef', 'olasi_hedef', 'hedef_degil', 'dogrudan_rakip', 'incelenmesi_gerekiyor');--> statement-breakpoint
CREATE TYPE "public"."location_status" AS ENUM('verified', 'inferred', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."sector_match_class" AS ENUM('strong_match', 'partial_match', 'mismatch', 'unknown');--> statement-breakpoint
CREATE TABLE "ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"company_id" uuid,
	"purpose" "ai_usage_purpose" NOT NULL,
	"model_name" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_creation_input_tokens" integer,
	"cache_read_input_tokens" integer,
	"input_cost_usd" numeric(10, 6) NOT NULL,
	"output_cost_usd" numeric(10, 6) NOT NULL,
	"total_cost_usd" numeric(10, 6) NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"search_result_name" text NOT NULL,
	"verified_company_name" text,
	"official_domain" text NOT NULL,
	"source_urls" jsonb NOT NULL,
	"source_query_ids" jsonb NOT NULL,
	"country" text,
	"city" text,
	"location_status" "location_status" DEFAULT 'unknown' NOT NULL,
	"commercial_role" "commercial_role" DEFAULT 'unknown' NOT NULL,
	"role_reasoning" text,
	"role_source_url" text,
	"role_evidence_text" text,
	"role_confidence" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"sector_score" integer NOT NULL,
	"region_score" integer NOT NULL,
	"buyer_need_score" integer NOT NULL,
	"extra_criteria_score" integer NOT NULL,
	"total_score" integer NOT NULL,
	"sector_match_class" "sector_match_class" NOT NULL,
	"buyer_status" "buyer_status" NOT NULL,
	"competitor_status" "competitor_status" NOT NULL,
	"evidence_confidence" integer NOT NULL,
	"decision_status" "decision_status" NOT NULL,
	"scoring_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"email" text NOT NULL,
	"source_url" text NOT NULL,
	"source_page_type" text,
	"domain_matches_company" boolean DEFAULT false NOT NULL,
	"verification_status" "email_verification_status" NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"evidence_type" text NOT NULL,
	"source_url" text,
	"source_title" text,
	"evidence_text" text NOT NULL,
	"supports_criterion" text,
	"confidence" text,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "human_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"review_status" "human_review_status" NOT NULL,
	"reasoning_text" text,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"company_id" uuid,
	"query_id" uuid,
	"stage" text NOT NULL,
	"error_code" text,
	"safe_error_message" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retryable" boolean DEFAULT false NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"retry_reason" text,
	"retry_delay_ms" integer,
	"final_status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"git_branch" text,
	"git_commit_sha" text,
	"vercel_deployment_id" text,
	"prompt_version" text NOT NULL,
	"scoring_version" text NOT NULL,
	"ai_model" text NOT NULL,
	"workspace_id" text,
	"user_company_name" text NOT NULL,
	"user_website" text NOT NULL,
	"target_sector" text NOT NULL,
	"target_region" text NOT NULL,
	"product_or_service" text NOT NULL,
	"extra_criteria" text,
	"score_threshold" integer NOT NULL,
	"excluded_roles" jsonb,
	"generated_profiles" jsonb,
	"selected_profile_ids" jsonb,
	"edited_profile_content" jsonb,
	"stage_durations" jsonb
);
--> statement-breakpoint
CREATE TABLE "search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"target_profile_id" text,
	"query_text" text NOT NULL,
	"query_language" text DEFAULT 'tr' NOT NULL,
	"google_country" text DEFAULT 'tr' NOT NULL,
	"google_language" text DEFAULT 'tr' NOT NULL,
	"query_order" integer NOT NULL,
	"generation_method" "generation_method" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"query_id" uuid NOT NULL,
	"result_position" integer NOT NULL,
	"title" text,
	"url" text NOT NULL,
	"snippet" text,
	"domain" text,
	"excluded" boolean DEFAULT false NOT NULL,
	"exclusion_reason" "exclusion_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_company_id_company_candidates_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_candidates" ADD CONSTRAINT "company_candidates_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_evaluations" ADD CONSTRAINT "company_evaluations_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_evaluations" ADD CONSTRAINT "company_evaluations_company_id_company_candidates_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_company_id_company_candidates_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_company_id_company_candidates_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_company_id_company_candidates_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_errors" ADD CONSTRAINT "scan_errors_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_errors" ADD CONSTRAINT "scan_errors_company_id_company_candidates_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_errors" ADD CONSTRAINT "scan_errors_query_id_search_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."search_queries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_scan_id_scan_runs_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_query_id_search_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."search_queries"("id") ON DELETE cascade ON UPDATE no action;