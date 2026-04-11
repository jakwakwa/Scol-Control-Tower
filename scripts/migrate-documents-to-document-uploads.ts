#!/usr/bin/env bun
/**
 * One-time migration: copy legacy `documents` rows into `document_uploads`.
 *
 * Usage:
 *   bun run scripts/migrate-documents-to-document-uploads.ts --dry-run
 *   bun run scripts/migrate-documents-to-document-uploads.ts
 */

import { desc, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { documents, documentUploads, workflows } from "@/db/schema";

type UploadCategory =
	| "standard"
	| "individual"
	| "financial"
	| "professional"
	| "industry";
type VerificationStatus =
	| "pending"
	| "verified"
	| "rejected"
	| "expired"
	| "failed_ocr"
	| "failed_unprocessable";

interface MappingPreview {
	legacyDocumentId: number;
	applicantId: number;
	workflowId: number;
	documentType: string;
	category: UploadCategory;
	storageKey: string;
	fileSize: number;
	verificationStatus: VerificationStatus;
}

function normalizeBase64(raw: string): string {
	return raw.replace(/^data:[^;]+;base64,/, "").trim();
}

function estimateBase64SizeBytes(rawBase64?: string | null): number {
	if (!rawBase64?.trim()) return 0;
	const normalized = normalizeBase64(rawBase64);
	const len = normalized.length;
	if (len === 0) return 0;
	const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
	return Math.max(0, Math.floor((len * 3) / 4) - padding);
}

function mapStatus(status?: string | null): VerificationStatus {
	const normalized = status?.toLowerCase().trim();
	switch (normalized) {
		case "verified":
		case "approved":
			return "verified";
		case "rejected":
		case "declined":
		case "invalid":
			return "rejected";
		case "expired":
			return "expired";
		case "failed_ocr":
			return "failed_ocr";
		case "failed_unprocessable":
			return "failed_unprocessable";
		default:
			return "pending";
	}
}

function mapCategory(input: {
	category?: string | null;
	source?: string | null;
	type: string;
}): UploadCategory {
	const category = input.category?.toLowerCase() ?? "";
	const source = input.source?.toLowerCase() ?? "";
	const type = input.type.toUpperCase();

	if (category.includes("industry")) return "industry";
	if (category.includes("professional")) return "professional";
	if (
		category.includes("financial") ||
		type.includes("BANK_STATEMENT") ||
		type.includes("FINANCIAL")
	) {
		return "financial";
	}
	if (
		category.includes("individual") ||
		category.includes("identity") ||
		category.includes("address") ||
		type.includes("ID") ||
		type.includes("ADDRESS") ||
		type.includes("RESIDENCE")
	) {
		return "individual";
	}
	if (source === "accountant" || source === "professional") return "professional";
	return "standard";
}

function deriveStorageKey(doc: { id: number; storageUrl?: string | null }): string {
	const url = doc.storageUrl?.trim();
	if (url) {
		return `legacy-url:${url}`;
	}
	return `legacy-document-${doc.id}`;
}

async function main() {
	const isDryRun = process.argv.includes("--dry-run");
	const db = getDatabaseClient();
	if (!db) {
		console.error("Failed to get database client");
		process.exit(1);
	}

	const legacyRows = await db
		.select({
			id: documents.id,
			applicantId: documents.applicantId,
			type: documents.type,
			status: documents.status,
			category: documents.category,
			source: documents.source,
			fileName: documents.fileName,
			fileContent: documents.fileContent,
			mimeType: documents.mimeType,
			storageUrl: documents.storageUrl,
			uploadedBy: documents.uploadedBy,
			uploadedAt: documents.uploadedAt,
			verifiedAt: documents.verifiedAt,
			processingStatus: documents.processingStatus,
			processingResult: documents.processingResult,
			notes: documents.notes,
		})
		.from(documents)
		.orderBy(desc(documents.id));

	if (legacyRows.length === 0) {
		console.info("No rows found in documents table. Nothing to migrate.");
		return;
	}

	const workflowByApplicant = new Map<number, number | null>();
	const sampleMappings: MappingPreview[] = [];

	let migrated = 0;
	let skipped = 0;
	let errored = 0;

	for (const row of legacyRows) {
		try {
			let workflowId = workflowByApplicant.get(row.applicantId);
			if (workflowId === undefined) {
				const latestWorkflow = await db
					.select({ id: workflows.id })
					.from(workflows)
					.where(eq(workflows.applicantId, row.applicantId))
					.orderBy(desc(workflows.id))
					.limit(1);
				workflowId = latestWorkflow[0]?.id ?? null;
				workflowByApplicant.set(row.applicantId, workflowId);
			}

			if (!workflowId) {
				skipped++;
				console.warn(
					`[SKIP] document ${row.id} (applicant ${row.applicantId}) has no workflow`
				);
				continue;
			}

			const category = mapCategory({
				category: row.category,
				source: row.source,
				type: row.type,
			});
			const verificationStatus = mapStatus(row.status);
			const storageKey = deriveStorageKey(row);
			const fileSize = estimateBase64SizeBytes(row.fileContent);

			const mappedRow = {
				workflowId,
				category,
				documentType: row.type,
				fileName: row.fileName?.trim() || `legacy-document-${row.id}`,
				fileSize,
				fileContent: row.fileContent,
				mimeType: row.mimeType?.trim() || "application/octet-stream",
				storageKey,
				storageUrl: row.storageUrl,
				verificationStatus,
				verificationNotes: row.notes,
				uploadedBy: row.uploadedBy ?? "system:migration",
				uploadedAt: row.uploadedAt ?? new Date(),
				verifiedAt: row.verifiedAt ?? null,
				metadata: JSON.stringify({
					legacyDocumentId: row.id,
					legacyCategory: row.category,
					legacySource: row.source,
					legacyStatus: row.status,
					legacyProcessingStatus: row.processingStatus,
					legacyProcessingResult: row.processingResult,
					migratedBy: "scripts/migrate-documents-to-document-uploads.ts",
				}),
			};

			if (sampleMappings.length < 5) {
				sampleMappings.push({
					legacyDocumentId: row.id,
					applicantId: row.applicantId,
					workflowId,
					documentType: row.type,
					category,
					storageKey,
					fileSize,
					verificationStatus,
				});
			}

			if (!isDryRun) {
				await db.insert(documentUploads).values(mappedRow);
			}
			migrated++;
		} catch (error) {
			errored++;
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[ERROR] document ${row.id}: ${message}`);
		}
	}

	console.info("");
	console.info(
		`Migration mode: ${isDryRun ? "DRY RUN (no writes)" : "LIVE (writes enabled)"}`
	);
	console.info(`Legacy rows scanned: ${legacyRows.length}`);
	console.info(`Migrated: ${migrated}`);
	console.info(`Skipped: ${skipped}`);
	console.info(`Errored: ${errored}`);
	console.info("");
	console.info("Sample mappings:");
	for (const sample of sampleMappings) {
		console.info(
			`- legacyId=${sample.legacyDocumentId} applicantId=${sample.applicantId} workflowId=${sample.workflowId} type=${sample.documentType} category=${sample.category} size=${sample.fileSize} storageKey=${sample.storageKey} status=${sample.verificationStatus}`
		);
	}
}

main().catch(error => {
	console.error("Migration failed:", error);
	process.exit(1);
});
