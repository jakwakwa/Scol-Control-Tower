import type { VatStatus } from "@/lib/risk-review/types";

export type VatBadgeVariant = "default" | "success" | "warning" | "danger";

/**
 * Canonical four-value headline for VAT evidence (UI + printable reports).
 * Detailed operator context lives in {@link getVatStatusExplanation}.
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
		case "invalid_input":
		case "timeout":
		case "manual_review":
		case "error":
			return "ERROR";
		default: {
			const _exhaustive: never = status;
			console.warn(`[formatVatStatus] Unhandled VatStatus: ${_exhaustive}`);
			return "ERROR";
		}
	}
}

/**
 * Short explanation for on-screen help and audit printouts.
 * Keeps wording informational — VAT is evidence, not a workflow gate.
 */
export function getVatStatusExplanation(status: VatStatus): string {
	switch (status) {
		case "verified":
			return "SARS (or configured lookup) confirmed the VAT number. This supports the file but does not by itself approve the workflow.";
		case "not_verified":
			return "The check ran but could not confirm the VAT number against the registry. Review other evidence; onboarding may continue pending broader risk sign-off.";
		case "not_checked":
			return "No VAT number was on file or the check was not run. This is informational only unless risk policy requires a number.";
		case "service_down":
			return "The VAT lookup service was offline or misconfigured. Retry later or capture evidence manually; this does not block the application by itself.";
		case "invalid_input":
			return "The VAT number failed format validation before lookup. Correct the number if applicable.";
		case "timeout":
			return "The registry request timed out or the agent reported a page error. Evidence may be incomplete; consider a manual check.";
		case "manual_review":
			return "Partial or ambiguous registry data — a risk reviewer should confirm the VAT position. Does not automatically pause the workflow.";
		case "error":
			return "An unexpected error occurred during the VAT step. Evidence may be missing; investigate logs if this applicant is material.";
		default: {
			const _exhaustive: never = status;
			console.warn(`[getVatStatusExplanation] Unhandled VatStatus: ${_exhaustive}`);
			return "VAT status could not be determined from stored evidence.";
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
