import type { VatStatus } from "@/lib/risk-review/types";

export type VatBadgeVariant = "default" | "success" | "warning" | "danger";

/**
 * Maps all 8 VatStatus values to unambiguous display labels.
 *
 * This is the single source of truth for VAT status labels used in both
 * the on-screen FICA card (fica-section.tsx) and the printable audit report
 * (printable-audit-report.tsx). Never duplicate this mapping.
 *
 * The exhaustive switch with `never` guard ensures a compile error is raised
 * if a new VatStatus value is added without updating the display module.
 */
export function formatVatStatus(status: VatStatus): string {
	switch (status) {
		case "verified":
			return "VERIFIED";
		case "not_verified":
			return "NOT VERIFIED";
		case "not_checked":
			return "NOT CHECKED";
		case "service_down":
			return "SERVICE UNAVAILABLE";
		case "invalid_input":
			return "INVALID VAT NUMBER";
		case "timeout":
			return "CHECK TIMED OUT";
		case "manual_review":
			return "MANUAL REVIEW REQUIRED";
		case "error":
			return "CHECK FAILED";
		default: {
			const _exhaustive: never = status;
			console.warn(`[formatVatStatus] Unhandled VatStatus: ${_exhaustive}`);
			return "UNKNOWN";
		}
	}
}

export function getVatBadgeVariant(status: VatStatus): VatBadgeVariant {
	switch (status) {
		case "verified":
			return "success";
		case "not_verified":
			return "warning";
		case "manual_review":
			return "warning";
		case "service_down":
		case "timeout":
		case "error":
		case "invalid_input":
			return "danger";
		case "not_checked":
			return "default";
		default: {
			const _exhaustive: never = status;
			console.warn(`[getVatBadgeVariant] Unhandled VatStatus: ${_exhaustive}`);
			return "default";
		}
	}
}
