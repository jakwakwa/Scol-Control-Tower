/**
 * Shared VAT status model, Zod validation, formatters, and payload parsers for
 * FICA card UI and printable reports. Notification routing lives elsewhere.
 */

export {
	parseVatStatusValue,
	VAT_STATUS_VALUES,
	VatStatusSchema,
	type VatStatus,
} from "@/lib/risk-review/vat-status/schema";

export {
	formatVatStatus,
	getVatBadgeVariant,
	getVatStatusExplanation,
	type VatBadgeVariant,
} from "@/lib/risk-review/vat-status/format";

export {
	parseVatVerificationPersisted,
	safeParseVatStatus,
	type VatVerificationRecord,
} from "@/lib/risk-review/vat-status/parse-payload";

/** @deprecated Use {@link parseVatStatusValue} — alias kept for existing imports */
export { parseVatStatusValue as parseStoredVatStatus } from "@/lib/risk-review/vat-status/schema";
