import { desc, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import {
	getMockScenarioDefinition,
	type MockScenarioDefinition,
	type MockScenarioId,
	readMockScenarioFromMetadata,
	mergeMockScenarioIntoMetadata,
	type PersistedMockScenario,
} from "@/lib/mock-scenarios";

export interface ResolvedWorkflowMockScenario {
	persisted: PersistedMockScenario;
	definition: MockScenarioDefinition;
	workflowId: number;
	applicantId: number;
}

export function buildPersistedMockScenario(
	id: MockScenarioId,
	overrides?: Partial<PersistedMockScenario>
): PersistedMockScenario {
	return {
		id,
		selectedAt: overrides?.selectedAt ?? new Date().toISOString(),
		autoRun: overrides?.autoRun ?? true,
		source: overrides?.source ?? "overlay",
	};
}

export async function resolveWorkflowMockScenario(options: {
	workflowId?: number;
	applicantId?: number;
	metadata?: string | null;
}): Promise<ResolvedWorkflowMockScenario | null> {
	const direct = readMockScenarioFromMetadata(options.metadata);
	if (direct) {
		const definition = getMockScenarioDefinition(direct.id);
		if (definition && options.workflowId && options.applicantId) {
			return {
				persisted: direct,
				definition,
				workflowId: options.workflowId,
				applicantId: options.applicantId,
			};
		}
	}

	const db = getDatabaseClient();
	if (!db) {
		return null;
	}

	const workflowRows = options.workflowId
		? await db
				.select({
					id: workflows.id,
					applicantId: workflows.applicantId,
					metadata: workflows.metadata,
				})
				.from(workflows)
				.where(eq(workflows.id, options.workflowId))
				.limit(1)
		: options.applicantId
			? await db
					.select({
						id: workflows.id,
						applicantId: workflows.applicantId,
						metadata: workflows.metadata,
					})
					.from(workflows)
					.where(eq(workflows.applicantId, options.applicantId))
					.orderBy(desc(workflows.startedAt))
					.limit(1)
			: [];

	const workflow = workflowRows[0];
	if (!workflow) {
		return null;
	}

	const persisted = readMockScenarioFromMetadata(workflow.metadata);
	if (!persisted) {
		return null;
	}

	const definition = getMockScenarioDefinition(persisted.id);
	if (!definition) {
		return null;
	}

	return {
		persisted,
		definition,
		workflowId: workflow.id,
		applicantId: workflow.applicantId,
	};
}

export async function persistWorkflowMockScenario(options: {
	workflowId: number;
	scenario: PersistedMockScenario;
}): Promise<void> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Database connection failed");
	}

	const [workflow] = await db
		.select({ metadata: workflows.metadata })
		.from(workflows)
		.where(eq(workflows.id, options.workflowId))
		.limit(1);

	if (!workflow) {
		throw new Error(`Workflow ${options.workflowId} not found`);
	}

	await db
		.update(workflows)
		.set({ metadata: mergeMockScenarioIntoMetadata(workflow.metadata, options.scenario) })
		.where(eq(workflows.id, options.workflowId));
}