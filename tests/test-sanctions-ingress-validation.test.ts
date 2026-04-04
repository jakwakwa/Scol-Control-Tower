import { beforeEach, describe, expect, it } from "bun:test";
import {
	ExternalSanctionsIngressCompatSchema,
	ExternalSanctionsIngressSchema,
} from "../lib/validations/control-tower/onboarding-schemas";
import { validatePerimeter } from "../lib/validations/control-tower/perimeter-validation";

describe("Sanctions Ingress Validation Rollout", () => {
	const validV2Payload = {
		version: "v2" as const,
		workflowId: 123,
		applicantId: 456,
		provider: "opensanctions" as const,
		externalCheckId: "check-123",
		checkedAt: new Date().toISOString(),
		passed: true,
		riskLevel: "LOW" as const,
		isBlocked: false,
		isPEP: false,
		requiresEDD: false,
		adverseMediaCount: 0,
		matchDetails: [],
	};

	const legacyV1Payload = {
		workflowId: 123,
		applicantId: 456,
		provider: "opensanctions" as const,
		externalCheckId: "check-123",
		checkedAt: new Date().toISOString(),
		passed: true,
		// Missing riskLevel (required in v2)
	};

	describe("Strict mode validation", () => {
		beforeEach(() => {
			process.env.ENFORCE_STRICT_SCHEMAS = "true";
		});

		it("should pass with v2 payload", () => {
			const result = validatePerimeter({
				schema: ExternalSanctionsIngressSchema,
				data: validV2Payload,
				eventName: "sanctions/external.received",
				sourceSystem: "sanctions-ingress",
				terminationReason: "VALIDATION_ERROR_SANCTIONS",
				compatibilitySchema: ExternalSanctionsIngressCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.data.version).toBe("v2");
				expect(result.data.riskLevel).toBe("LOW");
			}
		});

		it("should fail with v1 payload in strict mode", () => {
			const result = validatePerimeter({
				schema: ExternalSanctionsIngressSchema,
				data: legacyV1Payload,
				eventName: "sanctions/external.received",
				sourceSystem: "sanctions-ingress",
				terminationReason: "VALIDATION_ERROR_SANCTIONS",
				compatibilitySchema: ExternalSanctionsIngressCompatSchema,
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.failure.failedPaths).toContain("riskLevel");
			}
		});
	});

	describe("Warn mode validation", () => {
		beforeEach(() => {
			process.env.ENFORCE_STRICT_SCHEMAS = "warn";
		});

		it("should pass v2 payload without warnings", () => {
			const result = validatePerimeter({
				schema: ExternalSanctionsIngressSchema,
				data: validV2Payload,
				eventName: "sanctions/external.received",
				sourceSystem: "sanctions-ingress",
				terminationReason: "VALIDATION_ERROR_SANCTIONS",
				compatibilitySchema: ExternalSanctionsIngressCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect("warning" in result).toBe(false);
			}
		});

		it("should warn but pass with v1 payload", () => {
			const result = validatePerimeter({
				schema: ExternalSanctionsIngressSchema,
				data: legacyV1Payload,
				eventName: "sanctions/external.received",
				sourceSystem: "sanctions-ingress",
				terminationReason: "VALIDATION_ERROR_SANCTIONS",
				compatibilitySchema: ExternalSanctionsIngressCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok && "warning" in result) {
				expect(result.warning.failedPaths).toContain("riskLevel");
				expect(result.validationMode).toBe("warn");
			}
		});
	});

	describe("Version-specific validation", () => {
		beforeEach(() => {
			process.env.ENFORCE_STRICT_SCHEMAS = "warn";
		});

		it("should handle explicit v1 version", () => {
			const v1ExplicitPayload = {
				...legacyV1Payload,
				version: "v1" as const,
			};

			const result = validatePerimeter({
				schema: ExternalSanctionsIngressSchema,
				data: v1ExplicitPayload,
				eventName: "sanctions/external.received",
				sourceSystem: "sanctions-ingress",
				terminationReason: "VALIDATION_ERROR_SANCTIONS",
				compatibilitySchema: ExternalSanctionsIngressCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok && "warning" in result) {
				expect(result.warning.failedPaths).toContain("riskLevel");
			}
		});

		it("should handle missing version as v1", () => {
			const result = validatePerimeter({
				schema: ExternalSanctionsIngressSchema,
				data: legacyV1Payload,
				eventName: "sanctions/external.received",
				sourceSystem: "sanctions-ingress",
				terminationReason: "VALIDATION_ERROR_SANCTIONS",
				compatibilitySchema: ExternalSanctionsIngressCompatSchema,
			});

			expect(result.ok).toBe(true);
			if (result.ok && "warning" in result) {
				// Should fall back to compatibility schema
				expect(result.data.workflowId).toBe(123);
			}
		});
	});

	describe("Provider validation", () => {
		beforeEach(() => {
			process.env.ENFORCE_STRICT_SCHEMAS = "strict";
		});

		it("should validate known providers", () => {
			const providers = ["opensanctions", "firecrawl_un", "manual"];

			for (const provider of providers) {
				const payload = {
					...validV2Payload,
					provider: provider as "opensanctions" | "firecrawl_un" | "manual",
				};

				const result = validatePerimeter({
					schema: ExternalSanctionsIngressSchema,
					data: payload,
					eventName: "sanctions/external.received",
					sourceSystem: "sanctions-ingress",
					terminationReason: "VALIDATION_ERROR_SANCTIONS",
					compatibilitySchema: ExternalSanctionsIngressCompatSchema,
				});

				expect(result.ok).toBe(true);
			}
		});

		it("should reject removed firecrawl providers", () => {
			const providers = ["firecrawl_ofac", "firecrawl_fic"];

			for (const provider of providers) {
				const payload = {
					...validV2Payload,
					provider,
				};

				const result = validatePerimeter({
					schema: ExternalSanctionsIngressSchema,
					data: payload,
					eventName: "sanctions/external.received",
					sourceSystem: "sanctions-ingress",
					terminationReason: "VALIDATION_ERROR_SANCTIONS",
					compatibilitySchema: ExternalSanctionsIngressCompatSchema,
				});

				expect(result.ok).toBe(false);
				if (!result.ok) {
					expect(result.failure.failedPaths).toContain("provider");
				}
			}
		});

		it("should reject unknown providers", () => {
			const payload = {
				...validV2Payload,
				provider: "unknown-provider",
			};

			const result = validatePerimeter({
				schema: ExternalSanctionsIngressSchema,
				data: payload,
				eventName: "sanctions/external.received",
				sourceSystem: "sanctions-ingress",
				terminationReason: "VALIDATION_ERROR_SANCTIONS",
				compatibilitySchema: ExternalSanctionsIngressCompatSchema,
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.failure.failedPaths).toContain("provider");
			}
		});
	});
});
