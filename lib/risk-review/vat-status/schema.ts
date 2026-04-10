import { z } from "zod";

/**
 * Single source of truth for persisted / API VAT status strings.
 * Align with workflow + risk_check payload fields.
 */
export const VAT_STATUS_VALUES = [
	"verified",
	"not_verified",
	"not_checked",
	"service_down",
	"invalid_input",
	"timeout",
	"manual_review",
	"error",
] as const;

export const VatStatusSchema = z.enum(VAT_STATUS_VALUES);

/** Canonical VAT evidence status — use everywhere instead of ad-hoc string unions. */
export type VatStatus = z.infer<typeof VatStatusSchema>;

/**
 * Parse arbitrary JSON / DB values into a known {@link VatStatus}. Never throws.
 */
export function parseVatStatusValue(
	raw: unknown,
	fallback: VatStatus = "not_checked"
): VatStatus {
	const result = VatStatusSchema.safeParse(raw);
	if (result.success) {
		return result.data;
	}
	if (typeof raw === "string") {
		console.warn(
			`[vat-status] Unknown VAT status "${raw}" — using fallback "${fallback}"`
		);
	}
	return fallback;
}
