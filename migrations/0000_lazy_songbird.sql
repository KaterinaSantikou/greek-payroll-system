-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"property_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"geofences" jsonb DEFAULT '[]'::jsonb,
	"cost_center_code" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"company_id" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"shift_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"start_planned" timestamp NOT NULL,
	"end_planned" timestamp NOT NULL,
	"role" varchar(100) NOT NULL,
	"property_id" varchar NOT NULL,
	"meal_break_policy" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"employee_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"afm" varchar(9),
	"name" varchar(255) NOT NULL,
	"role" varchar(100) NOT NULL,
	"employment_type" varchar(50) NOT NULL,
	"hire_date" date NOT NULL,
	"term_date" date,
	"default_property_id" varchar,
	"union_cba_ref" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"employee_number" varchar,
	"company_id" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punch_events" (
	"event_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"property_id" varchar NOT NULL,
	"timestamp" timestamp NOT NULL,
	"type" varchar(20) NOT NULL,
	"source_device_id" varchar(100),
	"method" varchar(20) NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"offline_flag" boolean DEFAULT false,
	"signature_hash" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exceptions" (
	"exception_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"detected_at" timestamp NOT NULL,
	"employee_id" varchar,
	"property_id" varchar,
	"shift_id" varchar,
	"resolved_by" varchar,
	"resolution_code" varchar(50),
	"comments" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'open',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"timesheet_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"regular_hours" numeric(8, 2) DEFAULT '0',
	"night_hours" numeric(8, 2) DEFAULT '0',
	"overtime_hours_by_tier" jsonb DEFAULT '{}'::jsonb,
	"break_minutes" integer DEFAULT 0,
	"leave_minutes_by_type" jsonb DEFAULT '{}'::jsonb,
	"cost_center_allocations" jsonb DEFAULT '[]'::jsonb,
	"payroll_status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"email_verified" boolean DEFAULT false,
	"email_verified_at" timestamp,
	"password_hash" varchar,
	"locale" varchar DEFAULT 'en',
	"timezone" varchar DEFAULT 'Europe/Athens',
	"mfa_enabled" boolean DEFAULT false,
	"last_login_at" timestamp,
	"login_attempts" integer DEFAULT 0,
	"locked_until" timestamp,
	"gdpr_consent_at" timestamp,
	"tos_accepted_at" timestamp,
	"privacy_accepted_at" timestamp,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "data_retention_policy" (
	"policy_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"retention_years" integer NOT NULL,
	"description" text,
	"legal_basis" text,
	"last_purge_date" timestamp,
	"next_purge_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"log_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"user_id" varchar,
	"changes" jsonb NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"hash_chain" varchar(255) NOT NULL,
	"signature" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_alerts" (
	"alert_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"employee_id" varchar,
	"property_id" varchar,
	"message" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"resolution_notes" text
);
--> statement-breakpoint
CREATE TABLE "ergani_submission_log" (
	"submission_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"submission_order" integer NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"status" varchar(20) NOT NULL,
	"ergani_id" varchar(255),
	"error_code" varchar(100),
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"request_payload" jsonb NOT NULL,
	"response_payload" jsonb,
	"submitted_at" timestamp DEFAULT now(),
	"last_attempt_at" timestamp DEFAULT now(),
	"receipt_stored" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ergani_submission_log_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "analytics_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" varchar NOT NULL,
	"employee_id" varchar,
	"property_id" varchar NOT NULL,
	"department" varchar,
	"metric_date" timestamp NOT NULL,
	"value" numeric NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_kpis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"kpi_date" timestamp NOT NULL,
	"ergani_submission_success" numeric NOT NULL,
	"ergani_exception_rate" numeric NOT NULL,
	"max_hours_violations" integer NOT NULL,
	"rest_period_violations" integer NOT NULL,
	"digital_card_compliance" numeric NOT NULL,
	"data_retention_compliance" numeric NOT NULL,
	"overall_score" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labor_cost_forecast" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"department" varchar NOT NULL,
	"forecast_date" timestamp NOT NULL,
	"scheduled_hours" numeric NOT NULL,
	"projected_hours" numeric NOT NULL,
	"base_labor_cost" numeric NOT NULL,
	"overtime_cost" numeric NOT NULL,
	"total_cost" numeric NOT NULL,
	"variance_percentage" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_occupancy" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"property_id" varchar NOT NULL,
	"department" varchar NOT NULL,
	"status" varchar NOT NULL,
	"last_punch_time" timestamp NOT NULL,
	"shift_start" timestamp,
	"expected_shift_end" timestamp,
	"location" varchar,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "success_metric_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"metric_type" varchar NOT NULL,
	"alert_level" varchar NOT NULL,
	"threshold" numeric NOT NULL,
	"actual_value" numeric NOT NULL,
	"message" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "success_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"metric_date" timestamp NOT NULL,
	"pay_period_start" timestamp NOT NULL,
	"pay_period_end" timestamp NOT NULL,
	"ergani_submission_total" integer DEFAULT 0 NOT NULL,
	"ergani_submission_success" integer DEFAULT 0 NOT NULL,
	"ergani_submission_rate" numeric DEFAULT '0' NOT NULL,
	"total_exceptions" integer DEFAULT 0 NOT NULL,
	"resolved_exceptions" integer DEFAULT 0 NOT NULL,
	"unresolved_exceptions" integer DEFAULT 0 NOT NULL,
	"unresolved_exception_rate" numeric DEFAULT '0' NOT NULL,
	"total_punches" integer DEFAULT 0 NOT NULL,
	"geo_verified_punches" integer DEFAULT 0 NOT NULL,
	"geo_verification_rate" numeric DEFAULT '0' NOT NULL,
	"manual_payroll_entries" integer DEFAULT 0 NOT NULL,
	"scheduled_overtime_hours" numeric DEFAULT '0' NOT NULL,
	"actual_overtime_hours" numeric DEFAULT '0' NOT NULL,
	"overtime_variance" numeric DEFAULT '0' NOT NULL,
	"overtime_policy_compliance" boolean DEFAULT true NOT NULL,
	"audit_pack_generation_time" integer DEFAULT 0 NOT NULL,
	"audit_pack_size" integer DEFAULT 0 NOT NULL,
	"audit_pack_success" boolean DEFAULT true NOT NULL,
	"overall_compliance_score" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wage_components" (
	"component_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"base_salary" varchar NOT NULL,
	"hourly_rate" varchar,
	"food_allowance" varchar DEFAULT '0.00',
	"housing_allowance" varchar DEFAULT '0.00',
	"transport_allowance" varchar DEFAULT '0.00',
	"marriage_allowance" varchar DEFAULT '0.00',
	"family_allowance" varchar DEFAULT '0.00',
	"education_allowance" varchar DEFAULT '0.00',
	"experience_allowance" varchar DEFAULT '0.00',
	"position_allowance" varchar DEFAULT '0.00',
	"uniform_allowance" varchar DEFAULT '0.00',
	"tips_eligible" boolean DEFAULT false,
	"tips_pool_percentage" varchar DEFAULT '0.00',
	"per_diem_rate" varchar DEFAULT '0.00',
	"overtime_eligible" boolean DEFAULT true,
	"overtime_tier1_rate" varchar DEFAULT '1.25',
	"overtime_tier2_rate" varchar DEFAULT '1.50',
	"overtime_tier3_rate" varchar DEFAULT '1.75',
	"night_premium_rate" varchar DEFAULT '0.25',
	"sunday_premium_rate" varchar DEFAULT '0.75',
	"holiday_premium_rate" varchar DEFAULT '1.00',
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"department_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"department_code" varchar(10),
	"manager_employee_id" varchar,
	"cost_center_code" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "departments_department_code_key" UNIQUE("department_code")
);
--> statement-breakpoint
CREATE TABLE "payroll_rules" (
	"rule_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_name" varchar(100) NOT NULL,
	"version" varchar(20) NOT NULL,
	"category" varchar(50) NOT NULL,
	"priority" integer DEFAULT 100,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"rule_definition" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payroll_rules_rule_name_version_key" UNIQUE("rule_name","version")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notification_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"category" varchar NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"user_id" varchar,
	"employee_id" varchar,
	"property_id" varchar,
	"related_entity_type" varchar,
	"related_entity_id" varchar,
	"channels" text,
	"action_required" boolean DEFAULT false,
	"action_type" varchar,
	"action_data" text,
	"action_url" varchar,
	"status" varchar DEFAULT 'pending',
	"read_at" timestamp,
	"acted_at" timestamp,
	"action_by" varchar,
	"action_result" varchar,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"slack_enabled" boolean DEFAULT false,
	"slack_channel_id" varchar,
	"teams_enabled" boolean DEFAULT false,
	"teams_webhook_url" varchar,
	"email_enabled" boolean DEFAULT true,
	"sms_enabled" boolean DEFAULT false,
	"phone_number" varchar,
	"overtime_approvals" text,
	"ergani_alerts" text,
	"compliance_alerts" text,
	"payroll_digests" text,
	"quiet_hours_start" varchar DEFAULT '22:00',
	"quiet_hours_end" varchar DEFAULT '08:00',
	"timezone" varchar DEFAULT 'Europe/Athens',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_logs" (
	"log_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration" varchar NOT NULL,
	"action" varchar NOT NULL,
	"request_payload" text,
	"response_payload" text,
	"status" varchar NOT NULL,
	"duration" integer DEFAULT 0,
	"notification_id" varchar,
	"user_id" varchar,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_posting_salary_ranges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"job_title" varchar(255) NOT NULL,
	"department_id" varchar,
	"min_salary" numeric(10, 2) NOT NULL,
	"max_salary" numeric(10, 2) NOT NULL,
	"salary_basis" varchar(20) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR',
	"benefits_description" text,
	"pay_factors" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"last_updated" timestamp DEFAULT now(),
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "paycheck_history" (
	"paycheck_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"pay_period_start" date NOT NULL,
	"pay_period_end" date NOT NULL,
	"pay_date" date NOT NULL,
	"gross_pay" numeric(10, 2) NOT NULL,
	"net_pay" numeric(10, 2) NOT NULL,
	"tax_withheld" numeric(10, 2) DEFAULT '0',
	"efka_contributions" numeric(10, 2) DEFAULT '0',
	"solidarity_tax" numeric(10, 2) DEFAULT '0',
	"other_deductions" numeric(10, 2) DEFAULT '0',
	"payslip_data" jsonb,
	"status" varchar DEFAULT 'paid',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "digital_work_card_logs" (
	"log_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"work_date" date NOT NULL,
	"clock_in_time" timestamp,
	"clock_out_time" timestamp,
	"total_hours" numeric(5, 2),
	"break_minutes" integer DEFAULT 0,
	"overtime_hours" numeric(5, 2) DEFAULT '0',
	"location" varchar,
	"clock_method" varchar,
	"gps_coordinates" varchar,
	"device_info" jsonb,
	"ergani_sync_status" varchar DEFAULT 'pending',
	"ergani_submission_id" varchar,
	"notes" text,
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "time_correction_requests" (
	"request_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"work_card_log_id" varchar,
	"request_type" varchar NOT NULL,
	"original_value" varchar,
	"requested_value" varchar NOT NULL,
	"reason" text NOT NULL,
	"photo_evidence" varchar,
	"location" varchar,
	"submitted_via" varchar DEFAULT 'mobile',
	"manager_notes" text,
	"status" varchar DEFAULT 'pending',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "labor_newsfeed_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"headline" text NOT NULL,
	"summary" text NOT NULL,
	"source" varchar(255) NOT NULL,
	"source_url" text NOT NULL,
	"published_date" date NOT NULL,
	"last_checked" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"needs_review" boolean DEFAULT false,
	"review_reason" text,
	"ai_summary_hash" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "labor_newsfeed_items_external_id_key" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "labor_newsfeed_citations" (
	"id" serial PRIMARY KEY NOT NULL,
	"news_item_id" varchar NOT NULL,
	"citation_id" varchar(50) NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_description" text,
	"source_url" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "labor_newsfeed_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"refresh_interval_minutes" integer DEFAULT 240,
	"last_refresh" timestamp,
	"next_refresh" timestamp,
	"max_items" integer DEFAULT 6,
	"is_enabled" boolean DEFAULT true,
	"ai_model" varchar(50) DEFAULT 'gpt-4o',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pay_equity_analysis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"analysis_date" date NOT NULL,
	"analysis_type" varchar(50) NOT NULL,
	"job_category" varchar(100),
	"department_id" varchar,
	"male_employees" integer DEFAULT 0,
	"female_employees" integer DEFAULT 0,
	"other_gender_employees" integer DEFAULT 0,
	"male_avg_salary" numeric(10, 2),
	"female_avg_salary" numeric(10, 2),
	"other_avg_salary" numeric(10, 2),
	"gender_pay_gap_percent" numeric(5, 2),
	"median_male_salary" numeric(10, 2),
	"median_female_salary" numeric(10, 2),
	"adjusted_pay_gap" numeric(5, 2),
	"analysis_methodology" text,
	"control_factors" jsonb DEFAULT '[]'::jsonb,
	"compliance_status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pay_transparency_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"request_date" timestamp DEFAULT now(),
	"request_details" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"response_deadline" timestamp NOT NULL,
	"response_date" timestamp,
	"response_details" text,
	"response_documents" jsonb DEFAULT '[]'::jsonb,
	"handled_by" varchar,
	"rejection_reason" text,
	"follow_up_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pay_decision_explanations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"decision_type" varchar(50) NOT NULL,
	"decision_date" date NOT NULL,
	"old_salary" numeric(10, 2),
	"new_salary" numeric(10, 2) NOT NULL,
	"salary_change" numeric(10, 2),
	"performance_rating" varchar(20),
	"experience_years" numeric(4, 1),
	"education_level" varchar(50),
	"skills_assessment" jsonb DEFAULT '{}'::jsonb,
	"market_comparison" numeric(10, 2),
	"explanation" text NOT NULL,
	"contributing_factors" jsonb DEFAULT '[]'::jsonb,
	"comparison_group" varchar(100),
	"approved_by" varchar NOT NULL,
	"hr_reviewed" boolean DEFAULT false,
	"audit_trail" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pay_equity_compliance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"transposition_deadline" date DEFAULT '2026-06-07' NOT NULL,
	"next_reporting_deadline" date,
	"readiness_score" numeric(5, 2) DEFAULT '0',
	"last_assessment_date" timestamp,
	"salary_ranges_published" boolean DEFAULT false,
	"gender_pay_gap_reported" boolean DEFAULT false,
	"pay_transparency_policy_active" boolean DEFAULT false,
	"right_to_info_process_active" boolean DEFAULT false,
	"pay_decisions_criteria_published" boolean DEFAULT false,
	"last_gender_pay_gap_report" date,
	"employee_count" integer DEFAULT 0,
	"reporting_threshold_met" boolean DEFAULT false,
	"outstanding_actions" jsonb DEFAULT '[]'::jsonb,
	"compliance_notes" text,
	"risk_level" varchar(20) DEFAULT 'medium',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "csrd_reporting_periods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"reporting_year" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"esrs_version" varchar(20) DEFAULT '1.0',
	"implementation_wave" integer DEFAULT 1,
	"stop_the_clock_applied" boolean DEFAULT false,
	"materiality_assessment_date" date,
	"s1_workforce_material" boolean DEFAULT true,
	"materiality_justification" text,
	"reporting_status" varchar(20) DEFAULT 'draft',
	"submission_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "s1_workforce_characteristics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"measurement_date" date NOT NULL,
	"total_employees" integer NOT NULL,
	"total_fte" numeric(8, 2) NOT NULL,
	"non_employee_workers" integer DEFAULT 0,
	"employees_male" integer DEFAULT 0,
	"employees_female" integer DEFAULT 0,
	"employees_non_binary" integer DEFAULT 0,
	"employees_undisclosed" integer DEFAULT 0,
	"employees_under_30" integer DEFAULT 0,
	"employees_30_to_50" integer DEFAULT 0,
	"employees_over_50" integer DEFAULT 0,
	"permanent_contracts" integer DEFAULT 0,
	"temporary_contracts" integer DEFAULT 0,
	"part_time_employees" integer DEFAULT 0,
	"full_time_employees" integer DEFAULT 0,
	"employees_eu" integer DEFAULT 0,
	"employees_non_eu" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "s1_turnover_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"total_leavers" integer NOT NULL,
	"voluntary_leavers" integer DEFAULT 0,
	"involuntary_leavers" integer DEFAULT 0,
	"turnover_rate" numeric(5, 2) NOT NULL,
	"leavers_male" integer DEFAULT 0,
	"leavers_female" integer DEFAULT 0,
	"leavers_non_binary" integer DEFAULT 0,
	"leavers_under_30" integer DEFAULT 0,
	"leavers_30_to_50" integer DEFAULT 0,
	"leavers_over_50" integer DEFAULT 0,
	"total_hires" integer DEFAULT 0,
	"hire_male" integer DEFAULT 0,
	"hire_female" integer DEFAULT 0,
	"hire_rate" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "s1_collective_bargaining" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"employees_covered_by_agreements" integer NOT NULL,
	"coverage_percentage" numeric(5, 2) NOT NULL,
	"active_agreements" integer DEFAULT 0,
	"agreement_types" jsonb DEFAULT '[]'::jsonb,
	"workers_representation_exists" boolean DEFAULT false,
	"consultation_processes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "s1_health_safety_incidents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"incident_date" date NOT NULL,
	"incident_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"affected_worker_type" varchar(30) NOT NULL,
	"worker_gender" varchar(20),
	"worker_age" integer,
	"location" varchar(100) NOT NULL,
	"department" varchar(100),
	"incident_description" text,
	"root_cause" text,
	"work_days_lost" integer DEFAULT 0,
	"medical_treatment_required" boolean DEFAULT false,
	"corrective_actions" text,
	"preventive_actions" text,
	"investigation_completed" boolean DEFAULT false,
	"reported_to_authorities" boolean DEFAULT false,
	"reporting_date" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "s1_training_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"employee_id" varchar,
	"training_type" varchar(50) NOT NULL,
	"training_hours" numeric(6, 2) NOT NULL,
	"training_cost" numeric(10, 2),
	"participant_gender" varchar(20),
	"participant_age" integer,
	"participant_level" varchar(30),
	"completion_status" varchar(20) DEFAULT 'completed',
	"competency_gained" boolean DEFAULT false,
	"training_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "s1_work_life_balance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"employees_eligible_maternity_leave" integer DEFAULT 0,
	"employees_eligible_paternity_leave" integer DEFAULT 0,
	"employees_eligible_parental_leave" integer DEFAULT 0,
	"employees_eligible_flexible_work" integer DEFAULT 0,
	"maternity_leave_taken" integer DEFAULT 0,
	"paternity_leave_taken" integer DEFAULT 0,
	"parental_leave_taken" integer DEFAULT 0,
	"employees_remote_work" integer DEFAULT 0,
	"employees_flexible_hours" integer DEFAULT 0,
	"employees_job_sharing" integer DEFAULT 0,
	"return_rate_after_maternity_leave" numeric(5, 2),
	"return_rate_after_parental_leave" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "s1_pay_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"highest_paid_individual_total" numeric(12, 2) NOT NULL,
	"median_employee_compensation" numeric(10, 2) NOT NULL,
	"ceo_pay_ratio" numeric(8, 2) NOT NULL,
	"male_gross_hourly_pay" numeric(8, 2) NOT NULL,
	"female_gross_hourly_pay" numeric(8, 2) NOT NULL,
	"gender_pay_gap_percentage" numeric(5, 2) NOT NULL,
	"calculation_methodology" text NOT NULL,
	"contextual_factors" text,
	"non_binary_gross_hourly_pay" numeric(8, 2),
	"pay_equity_actions" jsonb DEFAULT '[]'::jsonb,
	"calculation_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "csrd_audit_trail" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"audit_date" timestamp DEFAULT now(),
	"audit_type" varchar(30) NOT NULL,
	"table_name" varchar(100),
	"record_id" varchar,
	"data_source" varchar(100) NOT NULL,
	"calculation_method" text,
	"input_parameters" jsonb DEFAULT '{}'::jsonb,
	"old_value" jsonb,
	"new_value" jsonb,
	"change_reason" text,
	"user_id" varchar,
	"system_version" varchar(20),
	"esrs_version" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "csrd_export_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporting_period_id" varchar NOT NULL,
	"export_type" varchar(30) NOT NULL,
	"export_format" varchar(10) DEFAULT 'json',
	"export_date" timestamp DEFAULT now(),
	"s1_metrics_included" jsonb DEFAULT '[]'::jsonb,
	"materiality_applied" boolean DEFAULT false,
	"data_quality_score" numeric(3, 1),
	"file_name" varchar(200),
	"file_size_bytes" integer,
	"checksum" varchar(64),
	"esrs_compliance_status" varchar(20) DEFAULT 'compliant',
	"validation_errors" jsonb DEFAULT '[]'::jsonb,
	"exported_by" varchar NOT NULL,
	"export_purpose" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verification_tokens_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"ip_address" varchar,
	"user_agent" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "magic_link_tokens_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_token" varchar NOT NULL,
	"refresh_token" varchar,
	"expires_at" timestamp NOT NULL,
	"refresh_expires_at" timestamp,
	"ip_address" varchar,
	"user_agent" varchar,
	"device_fingerprint" varchar,
	"last_activity_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_token_key" UNIQUE("session_token"),
	CONSTRAINT "user_sessions_refresh_token_key" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "auth_audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"action" varchar NOT NULL,
	"method" varchar,
	"result" varchar NOT NULL,
	"ip_address" varchar,
	"user_agent" varchar,
	"metadata" jsonb,
	"risk_score" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cba_packs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"sector" varchar NOT NULL,
	"authority_ref" varchar,
	"effective_from" date,
	"effective_to" date,
	"version" varchar,
	"doc_hash" varchar,
	"status" varchar DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wage_tables" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"category" varchar NOT NULL,
	"grade" varchar NOT NULL,
	"seniority_step" integer DEFAULT 0,
	"base_monthly" numeric(10, 2),
	"base_daily" numeric(10, 2),
	"base_hourly" numeric(10, 2),
	"unit" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pack_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"property_id" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"priority" integer DEFAULT 0,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "premium_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"code" varchar NOT NULL,
	"name" varchar NOT NULL,
	"rate_type" varchar,
	"value" numeric(10, 4),
	"bands" jsonb,
	"stackable" boolean DEFAULT true,
	"applies_to" varchar,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calc_provenance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduling_constraints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"max_hours_day" integer,
	"max_hours_week_avg" integer,
	"rest_min_hours" integer,
	"weekly_rest" integer,
	"split_shift" varchar,
	"break_min_minutes" integer,
	"sixth_day" varchar,
	"special_rules" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ergani_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"event_map" jsonb,
	"required_lead_times" jsonb,
	"reason_codes" jsonb,
	"document_templates" jsonb,
	"auto_submission" boolean DEFAULT false,
	"validation_rules" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tip_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"pool_source" varchar,
	"source_percentage" numeric(5, 2),
	"distribution_method" varchar,
	"role_points" jsonb,
	"employer_topup" numeric(5, 2),
	"tax_mapping" jsonb,
	"contrib_mapping" jsonb,
	"payout_frequency" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pack_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"property_id" varchar,
	"rule_type" varchar,
	"rule_id" varchar,
	"override_data" jsonb,
	"reason" text,
	"approved_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "allowance_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" varchar NOT NULL,
	"code" varchar NOT NULL,
	"name" varchar NOT NULL,
	"calc" varchar,
	"amount" numeric(10, 2),
	"cap" numeric(10, 2),
	"tax_treatment" varchar,
	"contributory" varchar,
	"conditions" jsonb,
	"created_at" timestamp DEFAULT now(),
	"percentage" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "severance_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar NOT NULL,
	"effective_from" timestamp NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true,
	"bands" jsonb NOT NULL,
	"legal_reference" varchar NOT NULL,
	"description" text,
	"description_gr" text,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar,
	"approved_at" timestamp,
	"approved_by" varchar,
	CONSTRAINT "severance_rules_version_key" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar NOT NULL,
	"payload" jsonb,
	"status" varchar DEFAULT 'pending',
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bank_profiles_canonical" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"pain_version" varchar(20) NOT NULL,
	"supports_instant" boolean NOT NULL,
	"sct_inst_amount_limit" integer,
	"cutoffs" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"property_id" varchar(50),
	"granted_by" varchar(255),
	"granted_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_import_batches" (
	"batch_id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" varchar(255) NOT NULL,
	"filename" varchar(255),
	"total_records" integer NOT NULL,
	"processed_records" integer DEFAULT 0,
	"successful_imports" integer DEFAULT 0,
	"failed_imports" integer DEFAULT 0,
	"validation_errors" jsonb,
	"import_data" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_training_progress" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"module_id" varchar(100) NOT NULL,
	"module_name" varchar(255) NOT NULL,
	"completion_percentage" integer DEFAULT 0,
	"completed_at" timestamp,
	"time_spent_minutes" integer DEFAULT 0,
	"quiz_score" integer,
	"certification_earned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_import_batches" (
	"batch_id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" varchar(255) NOT NULL,
	"filename" varchar(255),
	"payroll_period" varchar(20),
	"property_id" varchar(50),
	"total_payslips" integer NOT NULL,
	"processed_payslips" integer DEFAULT 0,
	"total_amount" numeric(12, 2),
	"validation_errors" jsonb,
	"payroll_data" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"import_type" varchar(20) DEFAULT 'historical',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_scenarios" (
	"scenario_id" varchar(50) PRIMARY KEY NOT NULL,
	"test_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"input_data" jsonb NOT NULL,
	"expected_output" jsonb NOT NULL,
	"test_status" varchar(20) DEFAULT 'pending',
	"actual_output" jsonb,
	"error_details" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"company_id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"tax_id" varchar(20),
	"registration_number" varchar(50),
	"industry_sector" varchar(100),
	"company_size" varchar(20),
	"address" jsonb,
	"contact_info" jsonb,
	"billing_info" jsonb,
	"subscription_plan" varchar(50) DEFAULT 'basic',
	"subscription_status" varchar(20) DEFAULT 'active',
	"license_limits" jsonb,
	"feature_flags" jsonb DEFAULT '{}'::jsonb,
	"timezone" varchar(50) DEFAULT 'Europe/Athens',
	"default_currency" varchar(3) DEFAULT 'EUR',
	"default_locale" varchar(5) DEFAULT 'el',
	"gdpr_settings" jsonb,
	"audit_settings" jsonb,
	"integration_settings" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "companies_tax_id_key" UNIQUE("tax_id")
);
--> statement-breakpoint
CREATE TABLE "company_users" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"department" varchar(100),
	"employee_id" varchar(50),
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"access_level" varchar(20) DEFAULT 'standard',
	"property_access" jsonb,
	"date_joined" timestamp DEFAULT now(),
	"last_active" timestamp,
	"is_active" boolean DEFAULT true,
	"invited_by" varchar(255),
	"invited_at" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "company_users_company_id_user_id_key" UNIQUE("company_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "company_role_templates" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar(50) NOT NULL,
	"role_name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"permissions" jsonb NOT NULL,
	"default_access_level" varchar(20) DEFAULT 'standard',
	"can_invite_users" boolean DEFAULT false,
	"can_manage_roles" boolean DEFAULT false,
	"max_properties_access" integer,
	"is_system_role" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "company_role_templates_company_id_role_name_key" UNIQUE("company_id","role_name")
);
--> statement-breakpoint
CREATE TABLE "data_access_audit" (
	"id" varchar(50) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar(50) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(50),
	"accessed_data" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"session_id" varchar(255),
	"success" boolean DEFAULT true,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "fk_properties_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_property_id_properties_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_default_property_id_properties_property_id_fk" FOREIGN KEY ("default_property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_company" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_events" ADD CONSTRAINT "punch_events_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_events" ADD CONSTRAINT "punch_events_property_id_properties_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_property_id_properties_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_shift_id_shifts_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("shift_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_alerts" ADD CONSTRAINT "compliance_alerts_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_alerts" ADD CONSTRAINT "compliance_alerts_property_id_properties_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_alerts" ADD CONSTRAINT "compliance_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ergani_submission_log" ADD CONSTRAINT "ergani_submission_log_event_id_punch_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."punch_events"("event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wage_components" ADD CONSTRAINT "wage_components_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_posting_salary_ranges" ADD CONSTRAINT "job_posting_salary_ranges_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_posting_salary_ranges" ADD CONSTRAINT "job_posting_salary_ranges_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paycheck_history" ADD CONSTRAINT "paycheck_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_work_card_logs" ADD CONSTRAINT "digital_work_card_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_work_card_log_id_fkey" FOREIGN KEY ("work_card_log_id") REFERENCES "public"."digital_work_card_logs"("log_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labor_newsfeed_citations" ADD CONSTRAINT "labor_newsfeed_citations_news_item_id_fkey" FOREIGN KEY ("news_item_id") REFERENCES "public"."labor_newsfeed_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_equity_analysis" ADD CONSTRAINT "pay_equity_analysis_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_equity_analysis" ADD CONSTRAINT "pay_equity_analysis_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_transparency_requests" ADD CONSTRAINT "pay_transparency_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_decision_explanations" ADD CONSTRAINT "pay_decision_explanations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_equity_compliance" ADD CONSTRAINT "pay_equity_compliance_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csrd_reporting_periods" ADD CONSTRAINT "csrd_reporting_periods_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "s1_workforce_characteristics" ADD CONSTRAINT "s1_workforce_characteristics_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "s1_turnover_metrics" ADD CONSTRAINT "s1_turnover_metrics_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "s1_collective_bargaining" ADD CONSTRAINT "s1_collective_bargaining_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "s1_health_safety_incidents" ADD CONSTRAINT "s1_health_safety_incidents_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "s1_training_metrics" ADD CONSTRAINT "s1_training_metrics_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "s1_training_metrics" ADD CONSTRAINT "s1_training_metrics_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "s1_work_life_balance" ADD CONSTRAINT "s1_work_life_balance_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "s1_pay_metrics" ADD CONSTRAINT "s1_pay_metrics_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csrd_audit_trail" ADD CONSTRAINT "csrd_audit_trail_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csrd_export_log" ADD CONSTRAINT "csrd_export_log_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."csrd_reporting_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wage_tables" ADD CONSTRAINT "wage_tables_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."cba_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_assignments" ADD CONSTRAINT "pack_assignments_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."cba_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_rules" ADD CONSTRAINT "premium_rules_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."cba_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_constraints" ADD CONSTRAINT "scheduling_constraints_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."cba_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ergani_profiles" ADD CONSTRAINT "ergani_profiles_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."cba_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_policies" ADD CONSTRAINT "tip_policies_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."cba_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_overrides" ADD CONSTRAINT "pack_overrides_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."cba_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allowance_rules" ADD CONSTRAINT "allowance_rules_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."cba_packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_templates" ADD CONSTRAINT "company_role_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_audit" ADD CONSTRAINT "data_access_audit_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_access_audit" ADD CONSTRAINT "data_access_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_punch_events_employee_timestamp" ON "punch_events" USING btree ("employee_id" text_ops,"timestamp" text_ops);--> statement-breakpoint
CREATE INDEX "idx_punch_events_property_timestamp" ON "punch_events" USING btree ("property_id" timestamp_ops,"timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_exceptions_detected_at" ON "exceptions" USING btree ("detected_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_exceptions_employee" ON "exceptions" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_exceptions_status" ON "exceptions" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_timesheets_employee_period" ON "timesheets" USING btree ("employee_id" date_ops,"period_start" date_ops,"period_end" text_ops);--> statement-breakpoint
CREATE INDEX "idx_timesheets_payroll_status" ON "timesheets" USING btree ("payroll_status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type" text_ops,"entity_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_log_event_type" ON "audit_log" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_log_timestamp" ON "audit_log" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_log_user" ON "audit_log" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_compliance_alerts_created" ON "compliance_alerts" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_compliance_alerts_employee" ON "compliance_alerts" USING btree ("employee_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_compliance_alerts_severity" ON "compliance_alerts" USING btree ("severity" text_ops);--> statement-breakpoint
CREATE INDEX "idx_compliance_alerts_unresolved" ON "compliance_alerts" USING btree ("resolved_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_ergani_submission_event" ON "ergani_submission_log" USING btree ("event_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ergani_submission_order" ON "ergani_submission_log" USING btree ("submission_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ergani_submission_status" ON "ergani_submission_log" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ergani_submission_timestamp" ON "ergani_submission_log" USING btree ("submitted_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_payroll_rules_active" ON "payroll_rules" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_payroll_rules_category" ON "payroll_rules" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_payroll_rules_effective" ON "payroll_rules" USING btree ("effective_from" date_ops,"effective_to" date_ops);
*/