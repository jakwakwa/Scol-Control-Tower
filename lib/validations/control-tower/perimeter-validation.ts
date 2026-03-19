import type { z } from "zod";
import type { KillSwitchReason } from "@/lib/services/kill-switch.service";
import { getValidationModeForEvent } from "@/lib/config/perimeter-validation";
import { 
	recordValidationFailure, 
	recordValidationSuccess, 
	inferProducer 
} from "@/lib/services/telemetry/perimeter-metrics";

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
	validationMode: "strict" | "warn";
}

export interface PerimeterValidationSuccess<T> {
	ok: true;
	data: T;
	failure?: undefined;
	validationMode: "strict" | "warn" | "disabled";
}

export interface PerimeterValidationWarning<T> {
	ok: true;
	data: T;
	warning: {
		eventName: string;
		sourceSystem: string;
		failedPaths: string[];
		messages: string[];
		raw: Record<string, unknown>;
	};
	validationMode: "warn";
}

export interface PerimeterValidationError {
	ok: false;
	data?: undefined;
	failure: PerimeterValidationFailure;
}

export type PerimeterValidationResult<T> =
	| PerimeterValidationSuccess<T>
	| PerimeterValidationWarning<T>
	| PerimeterValidationError;

interface ValidatePerimeterInput<T> {
	schema: z.ZodType<T>;
	data: unknown;
	eventName: string;
	sourceSystem: string;
	terminationReason: KillSwitchReason;
	compatibilitySchema?: z.ZodType<any>;
}

export function validatePerimeter<T>({
	schema,
	data,
	eventName,
	sourceSystem,
	terminationReason,
	compatibilitySchema,
}: ValidatePerimeterInput<T>): PerimeterValidationResult<T> {
	const validationMode = getValidationModeForEvent(eventName);
	const raw = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
	const applicantId = typeof raw.applicantId === "number" ? raw.applicantId : 0;
	const workflowId = typeof raw.workflowId === "number" ? raw.workflowId : 0;
	const producer = inferProducer(eventName, sourceSystem);

	// Disabled mode - skip validation entirely
	if (validationMode === "disabled") {
		// Use compatibility schema if available, otherwise passthrough
		const fallbackSchema = compatibilitySchema || (schema as any).passthrough();
		const result = fallbackSchema.safeParse(data);
		
		if (result.success) {
			recordValidationSuccess({
				eventName,
				sourceSystem,
				validationMode,
				producer,
				workflowId,
				applicantId,
			});
			return { ok: true, data: result.data, validationMode };
		}
		
		// Even in disabled mode, record if we can't parse at all
		recordValidationFailure({
			eventName,
			sourceSystem,
			validationMode: "warn", // Don't fail in disabled mode
			failedPaths: ["schema_parse_error"],
			messages: ["Failed to parse payload even with passthrough schema"],
			producer,
			workflowId,
			applicantId,
		});
		
		return { ok: true, data: data as T, validationMode };
	}

	// Try strict schema first
	const strictResult = schema.safeParse(data);

	if (strictResult.success) {
		recordValidationSuccess({
			eventName,
			sourceSystem,
			validationMode,
			producer,
			workflowId,
			applicantId,
		});
		return { ok: true, data: strictResult.data, validationMode };
	}

	// Strict validation failed - extract error details
	const fieldErrors = strictResult.error.flatten().fieldErrors;
	const failedPaths = Object.keys(fieldErrors);
	const messages = Object.values(fieldErrors)
		.flat()
		.filter((m): m is string => typeof m === "string");

	// Record the validation failure for telemetry
	recordValidationFailure({
		eventName,
		sourceSystem,
		validationMode,
		failedPaths,
		messages,
		producer,
		workflowId,
		applicantId,
	});

	// In warn mode, try compatibility schema fallback
	if (validationMode === "warn" && compatibilitySchema) {
		const compatResult = compatibilitySchema.safeParse(data);
		
		if (compatResult.success) {
			return {
				ok: true,
				data: compatResult.data,
				warning: {
					eventName,
					sourceSystem,
					failedPaths,
					messages,
					raw,
				},
				validationMode: "warn",
			};
		}
	}

	// In warn mode without compatibility schema, use passthrough
	if (validationMode === "warn") {
		const passthroughResult = (schema as any).passthrough().safeParse(data);
		
		if (passthroughResult.success) {
			return {
				ok: true,
				data: passthroughResult.data,
				warning: {
					eventName,
					sourceSystem,
					failedPaths,
					messages,
					raw,
				},
				validationMode: "warn",
			};
		}
	}

	// Strict mode or warn mode fallback failed - return error
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
			validationMode: validationMode === "warn" ? "warn" : "strict",
		},
	};
}
