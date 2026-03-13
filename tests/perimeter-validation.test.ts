import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { validatePerimeter } from "../lib/validations/control-tower/perimeter-validation";

const TestSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	name: z.string().min(1),
});

describe("validatePerimeter", () => {
	it("should return ok:true with parsed data on valid input", () => {
		const result = validatePerimeter({
			schema: TestSchema,
			data: { workflowId: 1, applicantId: 2, name: "Test" },
			eventName: "test/event",
			sourceSystem: "test",
			terminationReason: "VALIDATION_ERROR_INGEST",
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.workflowId).toBe(1);
			expect(result.data.applicantId).toBe(2);
			expect(result.data.name).toBe("Test");
		}
	});

	it("should return ok:false with failure details on invalid input", () => {
		const result = validatePerimeter({
			schema: TestSchema,
			data: { workflowId: -1, applicantId: 2 },
			eventName: "test/event",
			sourceSystem: "test",
			terminationReason: "VALIDATION_ERROR_INGEST",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.eventName).toBe("test/event");
			expect(result.failure.sourceSystem).toBe("test");
			expect(result.failure.terminationReason).toBe("VALIDATION_ERROR_INGEST");
			expect(result.failure.failedPaths.length).toBeGreaterThan(0);
			expect(result.failure.messages.length).toBeGreaterThan(0);
		}
	});

	it("should extract workflowId and applicantId from raw data even when validation fails", () => {
		const result = validatePerimeter({
			schema: TestSchema,
			data: { workflowId: 42, applicantId: 99 },
			eventName: "test/event",
			sourceSystem: "test",
			terminationReason: "VALIDATION_ERROR_INGEST",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.workflowId).toBe(42);
			expect(result.failure.applicantId).toBe(99);
		}
	});

	it("should default workflowId and applicantId to 0 when missing from raw data", () => {
		const result = validatePerimeter({
			schema: TestSchema,
			data: { name: "test" },
			eventName: "test/event",
			sourceSystem: "test",
			terminationReason: "VALIDATION_ERROR_INGEST",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.workflowId).toBe(0);
			expect(result.failure.applicantId).toBe(0);
		}
	});

	it("should handle non-object data gracefully", () => {
		const result = validatePerimeter({
			schema: TestSchema,
			data: null,
			eventName: "test/event",
			sourceSystem: "test",
			terminationReason: "VALIDATION_ERROR_INGEST",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.failure.workflowId).toBe(0);
			expect(result.failure.applicantId).toBe(0);
		}
	});
});
