#!/usr/bin/env bun

/**
 * Seed script for the Turso database using drizzle-seed.
 * Generates realistic, typed dummy data across all core tables.
 *
 * Usage: bun run scripts/seed.ts
 *    or: bun run db:seed
 */

import "../envConfig";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { reset, seed } from "drizzle-seed";
import * as schema from "../db/schema";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;

if (!url) {
	console.error("❌ DATABASE_URL is not defined");
	process.exit(1);
}

const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

/**
 * Only pass the table objects we want to seed (not the full schema with relations).
 * This avoids drizzle-seed trying to resolve FK chains for tables we aren't seeding.
 */
const seedSchema = {
	applicants: schema.applicants,
	workflows: schema.workflows,
	documents: schema.documents,
	riskAssessments: schema.riskAssessments,
	activityLogs: schema.activityLogs,
	notifications: schema.notifications,
	workflowEvents: schema.workflowEvents,
	quotes: schema.quotes,
	agents: schema.agents,
	internalForms: schema.internalForms,
	internalSubmissions: schema.internalSubmissions,
	documentUploads: schema.documentUploads,
	signatures: schema.signatures,
	applicantMagiclinkForms: schema.applicantMagiclinkForms,
	applicantSubmissions: schema.applicantSubmissions,
	sanctionClearance: schema.sanctionClearance,
	aiAnalysisLogs: schema.aiAnalysisLogs,
	agentCallbacks: schema.agentCallbacks,
};

async function main() {
	await reset(db, seedSchema);
	await seed(db, seedSchema).refine(funcs => ({
		// ── Core: Applicants ──────────────────────────────────────
		applicants: {
			count: 10,
			columns: {
				companyName: funcs.companyName(),
				tradingName: funcs.companyName(),
				registrationNumber: funcs.string({ isUnique: true }),
				contactName: funcs.fullName(),
				email: funcs.email(),
				phone: funcs.phoneNumber({ template: "+27 ## ### ####" }),
				businessType: funcs.valuesFromArray({
					values: [
						"NPO",
						"PROPRIETOR",
						"COMPANY",
						"TRUST",
						"BODY_CORPORATE",
						"PARTNERSHIP",
						"CLOSE_CORPORATION",
					],
				}),
				entityType: funcs.valuesFromArray({
					values: [
						"company",
						"close_corporation",
						"proprietor",
						"partnership",
						"npo",
						"trust",
						"body_corporate",
					],
				}),
				productType: funcs.valuesFromArray({
					values: ["standard", "premium_collections", "call_centre"],
				}),
				industry: funcs.valuesFromArray({
					values: [
						"Technology",
						"Manufacturing",
						"Retail",
						"Healthcare",
						"Finance",
						"Construction",
						"Agriculture",
						"Logistics",
					],
				}),
				employeeCount: funcs.int({ minValue: 5, maxValue: 500 }),
				mandateType: funcs.valuesFromArray({
					values: ["EFT", "DEBIT_ORDER", "CASH", "MIXED"],
				}),
				mandateVolume: funcs.int({ minValue: 50000, maxValue: 5000000 }),
				status: funcs.valuesFromArray({
					values: ["new", "qualified", "in_progress", "approved", "rejected"],
				}),
				riskLevel: funcs.valuesFromArray({
					values: ["green", "amber", "red"],
				}),
				itcScore: funcs.int({ minValue: 300, maxValue: 900 }),
				itcStatus: funcs.valuesFromArray({
					values: ["clear", "flagged", "pending"],
				}),
				escalationTier: funcs.int({ minValue: 1, maxValue: 3 }),
				sanctionStatus: funcs.valuesFromArray({
					values: ["clear", "flagged", "confirmed_hit"],
				}),
				accountExecutive: funcs.fullName(),
				notes: funcs.loremIpsum({ sentencesCount: 2 }),
			},
		},

		// ── Workflows (1 per applicant) ──────────────────────────
		workflows: {
			count: 10,
			columns: {
				stage: funcs.valuesFromArray({
					values: [1, 2, 3, 3, 3, 4, 4, 5, 6, 7], // Weighted towards 3 & 4
				}),
				status: funcs.valuesFromArray({
					values: [
						"pending",
						"processing",
						"awaiting_human",
						"awaiting_human",
						"awaiting_human", // Higher weight
						"completed",
						"failed",
					],
				}),
				mandateRetryCount: funcs.int({ minValue: 0, maxValue: 8 }),
				metadata: funcs.valuesFromArray({
					values: [
						null,
						JSON.stringify({ source: "website", channel: "direct" }),
						JSON.stringify({ source: "referral", referredBy: "Partner Corp" }),
						JSON.stringify({ notes: "Priority client", fastTrack: true }),
					],
				}),
			},
		},

		// ── Documents (2-3 per applicant) ────────────────────────
		documents: {
			count: 25,
			columns: {
				type: funcs.valuesFromArray({
					values: [
						"bank_statement",
						"id_document",
						"cipc_registration",
						"tax_clearance",
						"proof_of_address",
						"director_resolution",
					],
				}),
				status: funcs.valuesFromArray({
					values: ["pending", "uploaded", "verified", "rejected"],
				}),
				category: funcs.valuesFromArray({
					values: ["standard_application", "fica_entity", "fica_individual", "financial"],
				}),
				source: funcs.valuesFromArray({
					values: ["client", "agent", "internal", "system"],
				}),
				fileName: funcs.string({ isUnique: true }),
				processingStatus: funcs.valuesFromArray({
					values: ["pending", "processed", "failed"],
				}),
				notes: funcs.loremIpsum({ sentencesCount: 1 }),
			},
		},

		// ── Risk Assessments (1 per applicant) ───────────────────
		riskAssessments: {
			count: 10,
			columns: {
				overallRisk: funcs.valuesFromArray({
					values: ["green", "amber", "red"],
				}),
				cashFlowConsistency: funcs.valuesFromArray({
					values: ["stable", "volatile", "improving", "declining"],
				}),
				dishonouredPayments: funcs.int({ minValue: 0, maxValue: 15 }),
				averageDailyBalance: funcs.int({ minValue: 10000, maxValue: 2000000 }),
				accountMatchVerified: funcs.valuesFromArray({
					values: ["yes", "no", "pending"],
				}),
				letterheadVerified: funcs.valuesFromArray({
					values: ["yes", "no", "pending"],
				}),
				aiAnalysis: funcs.valuesFromArray({
					values: [
						JSON.stringify({
							scores: { aggregatedScore: 85, creditScore: 720, fraudScore: 10 },
							recommendation: "Approve",
							flags: [],
							sanctionsLevel: "none",
							validationSummary: { checked: true, passed: true },
							riskDetails: { lowRadio: true },
						}),
						JSON.stringify({
							scores: { aggregatedScore: 45, creditScore: 550, fraudScore: 60 },
							recommendation: "Reject",
							flags: ["High Identity Risk", "Inconsistent turnover"],
							sanctionsLevel: "possible_match",
							validationSummary: { checked: true, passed: false },
							riskDetails: { highRisk: true },
						}),
						JSON.stringify({
							scores: { aggregatedScore: 62, creditScore: 650, fraudScore: 20 },
							recommendation: "Review",
							flags: ["Director mismatch", "Recent address change"],
							sanctionsLevel: "none",
							validationSummary: { checked: true, passed: true },
							riskDetails: { mediumRisk: true },
						}),
					],
				}),
				reviewedBy: funcs.fullName(),
				notes: funcs.loremIpsum({ sentencesCount: 2 }),
			},
		},

		// ── Activity Logs ────────────────────────────────────────
		activityLogs: {
			count: 25,
			columns: {
				action: funcs.valuesFromArray({
					values: [
						"applicant_created",
						"document_uploaded",
						"risk_assessment_completed",
						"status_changed",
						"workflow_started",
						"quote_generated",
						"mandate_sent",
						"approval_requested",
					],
				}),
				description: funcs.loremIpsum({ sentencesCount: 1 }),
				performedBy: funcs.fullName(),
			},
		},

		// ── Notifications ────────────────────────────────────────
		notifications: {
			count: 15,
			columns: {
				type: funcs.valuesFromArray({
					values: [
						"awaiting",
						"completed",
						"failed",
						"timeout",
						"paused",
						"error",
						"warning",
						"info",
						"success",
					],
				}),
				message: funcs.loremIpsum({ sentencesCount: 1 }),
				read: funcs.valuesFromArray({ values: [false, true] }),
				actionable: funcs.valuesFromArray({ values: [false, true] }),
			},
		},

		// ── Workflow Events ──────────────────────────────────────
		workflowEvents: {
			count: 20,
			columns: {
				eventType: funcs.valuesFromArray({
					values: [
						"stage_transition",
						"document_received",
						"risk_check_initiated",
						"risk_check_completed",
						"quote_generated",
						"mandate_sent",
						"approval_granted",
						"callback_received",
					],
				}),
				actorType: funcs.valuesFromArray({
					values: ["platform", "user", "agent", "system"],
				}),
				actorId: funcs.email(),
			},
		},

		// ── Quotes ───────────────────────────────────────────────
		quotes: {
			count: 10,
			columns: {
				amount: funcs.int({ minValue: 100000, maxValue: 10000000 }),
				baseFeePercent: funcs.int({ minValue: 100, maxValue: 300 }),
				adjustedFeePercent: funcs.int({ minValue: 80, maxValue: 350 }),
				rationale: funcs.loremIpsum({ sentencesCount: 2 }),
				status: funcs.valuesFromArray({
					values: [
						"draft",
						"pending_approval",
						"pending_signature",
						"approved",
						"rejected",
					],
				}),
				generatedBy: funcs.valuesFromArray({
					values: ["platform", "gemini"],
				}),
			},
		},

		// ── Agents ───────────────────────────────────────────────
		agents: {
			count: 3,
			columns: {
				agentId: funcs.valuesFromArray({
					values: ["xt_risk_agent_v2", "xt_doc_gen_agent", "xt_signature_agent"],
					isUnique: true,
				}),
				name: funcs.valuesFromArray({
					values: [
						"Risk Verification Agent",
						"Document Generation Agent",
						"E-Signature Agent",
					],
				}),
				description: funcs.loremIpsum({ sentencesCount: 1 }),
				taskType: funcs.valuesFromArray({
					values: ["risk_verification", "document_generation", "electronic_signature"],
				}),
				status: funcs.valuesFromArray({
					values: ["active", "inactive"],
				}),
				callbackCount: funcs.int({ minValue: 0, maxValue: 100 }),
				errorCount: funcs.int({ minValue: 0, maxValue: 5 }),
			},
		},

		// ── Internal Forms ───────────────────────────────────────
		internalForms: {
			count: 15,
			columns: {
				formType: funcs.valuesFromArray({
					values: [
						"stratcol_agreement",
						"facility_application",
						"absa_6995",
						"fica_documents",
					],
				}),
				status: funcs.valuesFromArray({
					values: ["not_started", "in_progress", "submitted", "approved", "rejected"],
				}),
				currentStep: funcs.int({ minValue: 1, maxValue: 5 }),
				totalSteps: funcs.int({ minValue: 3, maxValue: 8 }),
			},
		},

		// ── Internal Submissions ─────────────────────────────────
		internalSubmissions: {
			count: 10,
			columns: {
				version: funcs.int({ minValue: 1, maxValue: 3 }),
				formData: funcs.valuesFromArray({
					values: [
						JSON.stringify({ field1: "value1", field2: "value2" }),
						JSON.stringify({ companyName: "Test Corp", director: "Jane Doe" }),
						JSON.stringify({ bankName: "ABSA", accountNumber: "9012345678" }),
					],
				}),
				isDraft: funcs.valuesFromArray({ values: [true, false] }),
				submittedBy: funcs.email(),
			},
		},

		// ── Document Uploads ─────────────────────────────────────
		documentUploads: {
			count: 20,
			columns: {
				category: funcs.valuesFromArray({
					values: ["standard", "individual", "financial", "professional", "industry"],
				}),
				documentType: funcs.valuesFromArray({
					values: [
						"cipc_registration",
						"director_id",
						"bank_statement",
						"tax_clearance",
						"proof_of_address",
					],
				}),
				fileName: funcs.string({ isUnique: true }),
				fileSize: funcs.int({ minValue: 50000, maxValue: 5000000 }),
				mimeType: funcs.valuesFromArray({
					values: ["application/pdf", "image/png", "image/jpeg"],
				}),
				storageKey: funcs.string({ isUnique: true }),
				verificationStatus: funcs.valuesFromArray({
					values: ["pending", "verified", "rejected"],
				}),
				uploadedBy: funcs.email(),
			},
		},

		// ── Signatures ───────────────────────────────────────────
		signatures: {
			count: 8,
			columns: {
				signatoryName: funcs.fullName(),
				signatoryRole: funcs.valuesFromArray({
					values: ["Director", "Authorised Representative", "Partner", "Trustee"],
				}),
				signatoryIdNumber: funcs.string({ isUnique: true }),
				signatureData: funcs.valuesFromArray({
					values: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...seeddata"],
				}),
				signatureHash: funcs.string({ isUnique: true }),
				ipAddress: funcs.valuesFromArray({
					values: ["192.168.1.1", "10.0.0.5", "172.16.0.22"],
				}),
			},
		},

		// ── Magic Link Forms ─────────────────────────────────────
		applicantMagiclinkForms: {
			count: 10,
			columns: {
				formType: funcs.valuesFromArray({
					values: ["FACILITY_APPLICATION", "SIGNED_QUOTATION", "FICA_UPLOAD"],
				}),
				status: funcs.valuesFromArray({
					values: ["pending", "sent", "viewed", "submitted", "expired"],
				}),
				tokenHash: funcs.string({ isUnique: true }),
				token: funcs.string({ isUnique: true }),
				tokenPrefix: funcs.string({ isUnique: true }),
			},
		},

		// ── Applicant Submissions ────────────────────────────────
		applicantSubmissions: {
			count: 8,
			columns: {
				formType: funcs.valuesFromArray({
					values: ["FACILITY_APPLICATION", "SIGNED_QUOTATION", "FICA_UPLOAD"],
				}),
				data: funcs.valuesFromArray({
					values: [
						JSON.stringify({ accepted: true, terms: "v2" }),
						JSON.stringify({ signed: true, date: "2025-01-15" }),
					],
				}),
				submittedBy: funcs.email(),
				version: funcs.int({ minValue: 1, maxValue: 3 }),
			},
		},

		// ── Agent Callbacks ──────────────────────────────────────
		agentCallbacks: {
			count: 5,
			columns: {
				eventId: funcs.string({ isUnique: true }),
				agentId: funcs.valuesFromArray({
					values: ["xt_risk_agent_v2", "xt_doc_gen_agent", "xt_signature_agent"],
				}),
				status: funcs.valuesFromArray({
					values: ["received", "validated", "processed", "rejected"],
				}),
				decision: funcs.valuesFromArray({
					values: ["approved", "rejected", "pending_info"],
				}),
				rawPayload: funcs.valuesFromArray({
					values: [
						JSON.stringify({ result: "pass", score: 85 }),
						JSON.stringify({ result: "fail", reason: "identity mismatch" }),
					],
				}),
			},
		},

		// ── Sanction Clearance ───────────────────────────────────
		sanctionClearance: {
			count: 3,
			columns: {
				sanctionListId: funcs.valuesFromArray({
					values: ["OFAC-001", "UN-SC-042", "EU-SANC-103"],
					isUnique: true,
				}),
				clearedBy: funcs.email(),
				clearanceReason: funcs.loremIpsum({ sentencesCount: 1 }),
				isFalsePositive: funcs.valuesFromArray({ values: [true, false] }),
			},
		},

		// ── AI Analysis Logs ─────────────────────────────────────
		aiAnalysisLogs: {
			count: 8,
			columns: {
				agentName: funcs.valuesFromArray({
					values: ["risk", "sanctions", "reporter"],
				}),
				promptVersionId: funcs.valuesFromArray({
					values: ["v1.0.0", "v1.1.0", "v2.0.0-beta"],
				}),
				confidenceScore: funcs.int({ minValue: 40, maxValue: 99 }),
				narrative: funcs.loremIpsum({ sentencesCount: 3 }),
			},
		},
	}));
}

main().catch(error => {
	console.error("❌ Seed failed:", error);
	process.exit(1);
});
