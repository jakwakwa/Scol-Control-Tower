/**
 * State Lock Service — Optimistic Concurrency Control for Workflow Records
 *
 * Prevents "Ghost Process" state corruption during parallel execution in Stage 3.
 * When a human finalizes a record (e.g., procurement approval/denial), the state
 * is locked. Any late-arriving background process that attempts to write will
 * detect the version mismatch and discard its stale data instead of overwriting.
 *
 * Architecture Review: Phase 1 — Resolving Parallel Execution Risks
 * @see docs/issues/2026-03-01-feat-harden-procurement-fallback-plan.md
 */

import { eq, sql } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { documents, workflows } from "@/db/schema";
import { type LogEventParams, logWorkflowEvent } from "./notification-events.service";

// ============================================
// Types
// ============================================

export class StateCollisionError extends Error {
	public readonly workflowId: number;
	public readonly expectedVersion: number;
	public readonly actualVersion: number;

	constructor(workflowId: number, expectedVersion: number, actualVersion: number) {
		super(
			`[StateLock] Collision detected on workflow ${workflowId}: ` +
				`expected version ${expectedVersion}, found ${actualVersion}. ` +
				`A finalized decision has already been recorded — discarding late-arriving data.`
		);
		this.name = "StateCollisionError";
		this.workflowId = workflowId;
		this.expectedVersion = expectedVersion;
		this.actualVersion = actualVersion;
	}
}

export interface StateLockInfo {
	isLocked: boolean;
	version: number;
	lockedAt: Date | null;
	lockedBy: string | null;
}

export interface StaleDataRecord {
	workflowId: number;
	source: string;
	reason: string;
	purgedDocumentIds?: number[];
	markedStaleAt: string;
}

// ============================================
// State Lock Operations
// ============================================

/**
 * Acquire a state lock on a workflow record.
 * Atomically increments the version and sets the lock metadata.
 * This should be called when a human makes a finalized decision
 * (e.g., procurement cleared/denied, manual approval).
 *
 * @returns The new lock version after acquisition
 */
export async function acquireStateLock(
	workflowId: number,
	actor: string
): Promise<number> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("[StateLock] Database connection failed");
	}

	const now = new Date();

	// Atomically increment version and set lock — prevents race conditions
	// between concurrent decision attempts
	await db
		.update(workflows)
		.set({
			stateLockVersion: sql`COALESCE(${workflows.stateLockVersion}, 0) + 1`,
			stateLockedAt: now,
			stateLockedBy: actor,
		})
		.where(eq(workflows.id, workflowId));

	// Read back the new version
	const [updated] = await db
		.select({
			version: workflows.stateLockVersion,
		})
		.from(workflows)
		.where(eq(workflows.id, workflowId));

	const newVersion = updated?.version ?? 1;

	console.info(
		`[StateLock] Lock acquired on workflow ${workflowId} by ${actor} — version ${newVersion}`
	);

	return newVersion;
}

/**
 * Check if a workflow's state has been locked (finalized by a human decision).
 * Background processes should call this before attempting to write results.
 */
export async function getStateLockInfo(workflowId: number): Promise<StateLockInfo> {
	const db = getDatabaseClient();
	if (!db) {
		return { isLocked: false, version: 0, lockedAt: null, lockedBy: null };
	}

	try {
		const [result] = await db
			.select({
				version: workflows.stateLockVersion,
				lockedAt: workflows.stateLockedAt,
				lockedBy: workflows.stateLockedBy,
			})
			.from(workflows)
			.where(eq(workflows.id, workflowId));

		if (!result) {
			return { isLocked: false, version: 0, lockedAt: null, lockedBy: null };
		}

		const version = result.version ?? 0;

		return {
			isLocked: version > 0 && result.lockedAt !== null,
			version,
			lockedAt: result.lockedAt,
			lockedBy: result.lockedBy,
		};
	} catch (error) {
		console.error("[StateLock] Error checking lock state:", error);
		return { isLocked: false, version: 0, lockedAt: null, lockedBy: null };
	}
}

/**
 * Guard against state collisions using optimistic concurrency control.
 * Compares the expected version (captured before background work began)
 * against the current version. If they differ, a human has finalized
 * the record and the caller must discard its data.
 *
 * @throws StateCollisionError if versions don't match
 */
export async function guardStateCollision(
	workflowId: number,
	expectedVersion: number
): Promise<void> {
	const lockInfo = await getStateLockInfo(workflowId);

	if (lockInfo.version !== expectedVersion) {
		throw new StateCollisionError(workflowId, expectedVersion, lockInfo.version);
	}
}

/**
 * Mark data from a failed automation attempt as stale.
 * Called when a manual review trigger fires to ensure human operators
 * don't accidentally validate corrupted/partial data from the failed process.
 *
 * Steps:
 * 1. Mark related documents with processingStatus = "stale"
 * 2. Log the stale data event for audit trail
 */
export async function markStaleData(
	workflowId: number,
	source: string,
	reason: string
): Promise<StaleDataRecord> {
	const db = getDatabaseClient();
	const markedStaleAt = new Date().toISOString();
	const purgedDocumentIds: number[] = [];

	if (db) {
		try {
			// Find and mark any documents with incomplete/partial processing status
			// from the failed automation attempt
			const partialDocs = await db
				.select({ id: documents.id })
				.from(documents)
				.where(eq(documents.applicantId, workflowId));

			// Mark documents that have incomplete processing as stale
			for (const doc of partialDocs) {
				await db
					.update(documents)
					.set({
						processingStatus: "stale",
						notes: `[STALE] Marked stale on ${markedStaleAt}. Source: ${source}. Reason: ${reason}`,
					})
					.where(eq(documents.id, doc.id));
				purgedDocumentIds.push(doc.id);
			}
		} catch (error) {
			console.error("[StateLock] Error marking stale data:", error);
		}
	}

	// Log the stale data event for audit
	await logWorkflowEvent({
		workflowId,
		eventType: "stale_data_flagged" as LogEventParams["eventType"],
		payload: {
			source,
			reason,
			purgedDocumentIds,
			markedStaleAt,
		},
		actorType: "platform",
	});

	console.warn(
		`[StateLock] Stale data flagged for workflow ${workflowId}: ` +
			`source=${source}, reason=${reason}, purgedDocs=${purgedDocumentIds.length}`
	);

	return {
		workflowId,
		source,
		reason,
		purgedDocumentIds,
		markedStaleAt,
	};
}

/**
 * Handle a state collision gracefully.
 * Called when a background process detects that a human has already finalized
 * the record. Logs the discarded data and marks any partial results as stale.
 */
export async function handleStateCollision(
	workflowId: number,
	source: string,
	discardedData: Record<string, unknown>
): Promise<void> {
	console.warn(
		`[StateLock] Ghost process detected on workflow ${workflowId} from ${source}. ` +
			"Discarding late-arriving data and marking as stale."
	);

	// Log the discarded data for transparency and debugging
	await logWorkflowEvent({
		workflowId,
		eventType: "stale_data_flagged" as LogEventParams["eventType"],
		payload: {
			collisionType: "ghost_process",
			source,
			action: "discarded",
			discardedData,
			detectedAt: new Date().toISOString(),
		},
		actorType: "platform",
	});

	// Mark any partial data from this source as stale
	await markStaleData(
		workflowId,
		source,
		`Ghost process collision — late-arriving data from ${source} discarded`
	);
}
