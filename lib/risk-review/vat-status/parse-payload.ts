import { z } from "zod";
import {
	parseVatStatusValue,
	type VatStatus,
	VatStatusSchema,
} from "@/lib/risk-review/vat-status/schema";

/** Normalized VAT verification block — matches `RiskReviewData["ficaData"]["vatVerification"]`. */
export type VatVerificationRecord = {
	checked: boolean;
	status: VatStatus;
	errorState?: VatStatus;
	vatNumber?: string;
	tradingName?: string;
	office?: string;
	message?: string;
	checkedAt?: string;
};

/**
 * Zod shape for `ficaData.vatVerification` as stored in risk_check JSON payloads.
 * Unknown `status` / `errorState` strings are coerced via {@link parseVatStatusValue}.
 */
const LooseVatVerificationSchema = z.object({
	checked: z.boolean().optional(),
	status: z.unknown().optional(),
	errorState: z.unknown().optional(),
	vatNumber: z.string().optional(),
	tradingName: z.string().optional(),
	office: z.string().optional(),
	message: z.string().optional(),
	checkedAt: z.string().optional(),
});

/**
 * Parse a persisted VAT verification blob from FICA check payload JSON.
 * Returns `null` when the value is not a plain object or fails structural parse
 * (caller should use report defaults).
 */
export function parseVatVerificationPersisted(
	raw: unknown
): VatVerificationRecord | null {
	if (raw === null || raw === undefined) {
		return null;
	}
	const loose = LooseVatVerificationSchema.safeParse(raw);
	if (!loose.success) {
		return null;
	}
	const v = loose.data;
	const status = parseVatStatusValue(v.status, "not_checked");
	const errorStateRaw = v.errorState;
	const errorState =
		errorStateRaw === undefined || errorStateRaw === null
			? undefined
			: parseVatStatusValue(errorStateRaw, "not_checked");

	return {
		checked: v.checked ?? false,
		status,
		errorState,
		vatNumber: v.vatNumber,
		tradingName: v.tradingName,
		office: v.office,
		message: v.message,
		checkedAt: v.checkedAt,
	};
}

/**
 * Validate that a value is exactly a known {@link VatStatus} (for strict API boundaries).
 */
export function safeParseVatStatus(raw: unknown): VatStatus | undefined {
	const r = VatStatusSchema.safeParse(raw);
	return r.success ? r.data : undefined;
}
