import type { z } from "zod";
import type { KillSwitchReason } from "@/lib/services/kill-switch.service";

/**
 * Structured perimeter validation result.
 *
 * Used at the ingest boundary to produce consistent error details
 * for logging, metrics, and kill-switch termination before any
 * downstream side-effects or AI calls happen.
 */

export interface PerimeterValidationFailure {
	eventName: string;
	sourceSystem: string;
	workflowId: number;
	applicantId: number;
	failedPaths: string[];
	messages: string[];
	terminationReason: KillSwitchReason;
	raw: Record<string, unknown>;
}

export interface PerimeterValidationSuccess<T> {
	ok: true;
	data: T;
	failure?: undefined;
}

export interface PerimeterValidationError {
	ok: false;
	data?: undefined;
	failure: PerimeterValidationFailure;
}

export type PerimeterValidationResult<T> =
	| PerimeterValidationSuccess<T>
	| PerimeterValidationError;

interface ValidatePerimeterInput<T> {
	schema: z.ZodType<T>;
	data: unknown;
	eventName: string;
	sourceSystem: string;
	terminationReason: KillSwitchReason;
}

export function validatePerimeter<T>({
	schema,
	data,
	eventName,
	sourceSystem,
	terminationReason,
}: ValidatePerimeterInput<T>): PerimeterValidationResult<T> {
	const result = schema.safeParse(data);

	if (result.success) {
		return { ok: true, data: result.data };
	}

	const raw = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
	const applicantId =
		typeof raw.applicantId === "number" ? raw.applicantId : 0;
	const workflowId =
		typeof raw.workflowId === "number" ? raw.workflowId : 0;

	const fieldErrors = result.error.flatten().fieldErrors;
	const failedPaths = Object.keys(fieldErrors);
	const messages = Object.values(fieldErrors)
		.flat()
		.filter((m): m is string => typeof m === "string");

	return {
		ok: false,
		failure: {
			eventName,
			sourceSystem,
			workflowId,
			applicantId,
			failedPaths,
			messages,
			terminationReason,
			raw,
		},
	};
}
