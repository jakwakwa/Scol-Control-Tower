import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicantMagiclinkForms, applicantSubmissions } from "@/db/schema";
import type { FormDecisionOutcome, FormInstanceStatus, FormType } from "@/lib/types";

interface CreateFormInstanceOptions {
	applicantId: number;
	workflowId?: number;
	formType: FormType;
	expiresInDays?: number;
}

interface CreateFormInstanceResult {
	id: number;
	token: string;
}

const TOKEN_BYTES = 32;

export function hashToken(token: string) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createFormInstance(
	options: CreateFormInstanceOptions
): Promise<CreateFormInstanceResult> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
	const tokenHash = hashToken(token);
	const tokenPrefix = token.slice(0, 6);
	const expiresAt =
		options.expiresInDays !== undefined
			? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
			: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

	const [created] = await db
		.insert(applicantMagiclinkForms)
		.values([
			{
				applicantId: options.applicantId,
				workflowId: options.workflowId,
				formType: options.formType,
				status: "sent",
				tokenHash,
				token,
				tokenPrefix,
				sentAt: new Date(),
				expiresAt,
				createdAt: new Date(),
			},
		])
		.returning();

	if (!created) {
		throw new Error("Failed to create form instance");
	}

	return { id: created.id, token };
}

export async function getFormInstanceByToken(token: string) {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const tokenHash = hashToken(token);
	const result = await db
		.select()
		.from(applicantMagiclinkForms)
		.where(eq(applicantMagiclinkForms.tokenHash, tokenHash));

	return result[0] ?? null;
}

export async function markFormInstanceStatus(
	formInstanceId: number,
	status: FormInstanceStatus
) {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	await db
		.update(applicantMagiclinkForms)
		.set({
			status,
			viewedAt: status === "viewed" ? new Date() : undefined,
			submittedAt: status === "submitted" ? new Date() : undefined,
		})
		.where(eq(applicantMagiclinkForms.id, formInstanceId));
}

export async function recordFormSubmission(options: {
	applicantMagiclinkFormId: number;
	applicantId: number;
	workflowId?: number | null;
	formType: FormType;
	data: Record<string, unknown>;
	submittedBy?: string;
}) {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const [submission] = await db
		.insert(applicantSubmissions)
		.values([
			{
				applicantMagiclinkFormId: options.applicantMagiclinkFormId,
				applicantId: options.applicantId,
				workflowId: options.workflowId ?? null,
				formType: options.formType,
				data: JSON.stringify(options.data),
				submittedBy: options.submittedBy,
				submittedAt: new Date(),
			},
		])
		.returning();

	await markFormInstanceStatus(options.applicantMagiclinkFormId, "submitted");

	return submission;
}

export async function recordFormDecision(options: {
	formInstanceId: number;
	outcome: FormDecisionOutcome;
	reason?: string;
}) {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const [updated] = await db
		.update(applicantMagiclinkForms)
		.set({
			decisionStatus: "responded",
			decisionOutcome: options.outcome.toLowerCase(),
			decisionReason: options.reason?.trim() || null,
			decisionAt: new Date(),
		})
		.where(eq(applicantMagiclinkForms.id, options.formInstanceId))
		.returning();

	return updated ?? null;
}
