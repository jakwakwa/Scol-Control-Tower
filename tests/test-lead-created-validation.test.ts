import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { validatePerimeter } from "../lib/validations/control-tower/perimeter-validation";
import { 
	LeadCreatedSchema, 
	LeadCreatedCompatSchema 
} from "../lib/validations/control-tower/onboarding-schemas";

describe("Lead Created Validation Rollout", () => {
	const validStrictPayload = {
		applicantId: 123,
		workflowId: 456,
		companyName: "Test Corp",
		contactName: "John Doe",
		email: "john@testcorp.com",
		source: "dashboard" as const,
		createdAt: new Date().toISOString(),
	};

	const minimalLegacyPayload = {
		applicantId: 123,
		workflowId: 456,
	};

	describe("Strict mode validation", () => {
		// Mock strict mode
		beforeEach(() => {
			process.env.ENFORCE_STRICT_SCHEMAS = "true";
		});

		it("should pass with complete payload", () => {
			const result = validatePerimeter({
				schema: LeadCreatedSchema,
				data: validStrictPayload,
				eventName: "onboarding/lead.created",
				sourceSystem: "control-tower",
				terminationReason: "VALIDATION_ERROR_INGEST",
				compatibilitySchema: LeadCreatedCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data.companyName).toBe("Test Corp");
				expect(result.data.source).toBe("dashboard");
			}
		});

		it("should fail with minimal payload in strict mode", () => {
			const result = validatePerimeter({
				schema: LeadCreatedSchema,
				data: minimalLegacyPayload,
				eventName: "onboarding/lead.created",
				sourceSystem: "control-tower",
				terminationReason: "VALIDATION_ERROR_INGEST",
				compatibilitySchema: LeadCreatedCompatSchema,
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.failure.failedPaths).toContain("companyName");
				expect(result.failure.failedPaths).toContain("contactName");
				expect(result.failure.failedPaths).toContain("email");
			}
		});
	});

	describe("Warn mode validation", () => {
		beforeEach(() => {
			process.env.ENFORCE_STRICT_SCHEMAS = "warn";
		});

		it("should pass with complete payload", () => {
			const result = validatePerimeter({
				schema: LeadCreatedSchema,
				data: validStrictPayload,
				eventName: "onboarding/lead.created",
				sourceSystem: "control-tower",
				terminationReason: "VALIDATION_ERROR_INGEST",
				compatibilitySchema: LeadCreatedCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.validationMode).toBe("warn");
				expect("warning" in result).toBe(false);
			}
		});

		it("should warn but pass with minimal payload", () => {
			const result = validatePerimeter({
				schema: LeadCreatedSchema,
				data: minimalLegacyPayload,
				eventName: "onboarding/lead.created",
				sourceSystem: "control-tower",
				terminationReason: "VALIDATION_ERROR_INGEST",
				compatibilitySchema: LeadCreatedCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok && "warning" in result) {
				expect(result.warning.failedPaths).toContain("companyName");
				expect(result.warning.failedPaths).toContain("contactName");
				expect(result.warning.failedPaths).toContain("email");
				expect(result.validationMode).toBe("warn");
			}
		});
	});

	describe("Disabled mode validation", () => {
		beforeEach(() => {
			process.env.ENFORCE_STRICT_SCHEMAS = "false";
		});

		it("should pass any payload", () => {
			const result = validatePerimeter({
				schema: LeadCreatedSchema,
				data: { random: "data", applicantId: 123 },
				eventName: "onboarding/lead.created",
				sourceSystem: "control-tower",
				terminationReason: "VALIDATION_ERROR_INGEST",
				compatibilitySchema: LeadCreatedCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.validationMode).toBe("disabled");
			}
		});
	});

	describe("Per-event overrides", () => {
		beforeEach(() => {
			process.env.ENFORCE_STRICT_SCHEMAS = "true";
			process.env.PERIMETER_VALIDATION_OVERRIDES = "onboarding/lead.created:warn";
		});

		it("should use warn mode for specific event override", () => {
			const result = validatePerimeter({
				schema: LeadCreatedSchema,
				data: minimalLegacyPayload,
				eventName: "onboarding/lead.created",
				sourceSystem: "control-tower",
				terminationReason: "VALIDATION_ERROR_INGEST",
				compatibilitySchema: LeadCreatedCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok && "warning" in result) {
				expect(result.validationMode).toBe("warn");
			}
		});

		afterEach(() => {
			process.env.PERIMETER_VALIDATION_OVERRIDES = undefined;
		});
	});
});
