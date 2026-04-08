/** `?printMode=` for E2E PDF capture (no `window.print()`). Active only when NEXT_PUBLIC_E2E_ENABLED. */
export type PrintMode = "credit-compliance" | "procurement" | null;

const VALID_PRINT_MODES = new Set<string>(["credit-compliance", "procurement"]);

export function parsePrintModeParam(search: string): PrintMode {
	if (!search) return null;
	const val = new URLSearchParams(search).get("printMode");
	if (val && VALID_PRINT_MODES.has(val)) {
		return val as PrintMode;
	}
	return null;
}
