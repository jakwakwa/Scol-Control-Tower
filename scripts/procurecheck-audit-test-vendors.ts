#!/usr/bin/env bun
/**
 * Lists STC-* sandbox vendors from POST /vendors/getlist for manual cleanup (no delete API).
 * Read-only. Usage: bun run scripts/procurecheck-audit-test-vendors.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

const root = process.cwd();
config({ path: resolve(root, ".env.test") });
config({ path: resolve(root, ".env.local"), override: true });

const { authenticate, getProcureCheckRuntimeConfig, withProcureCheckProxy } =
	await import("@/lib/procurecheck/client");

const VendorRowSchema = z
	.object({
		Id: z.string().optional(),
		FullName: z.string().optional(),
		UniqueIdentifier: z.string().nullable().optional(),
		IdOrNumber: z.string().nullable().optional(),
		Created: z.string().optional(),
		BusinessTypeId: z.number().optional(),
		Status: z.string().optional(),
	})
	.passthrough();

const VendorListEnvelopeSchema = z
	.object({
		VendorList: z.array(VendorRowSchema).optional().default([]),
		TotalVendors: z.number().optional().default(0),
	})
	.passthrough();

interface AuditVendor {
	vendorId: string;
	externalId: string;
	companyName: string;
	regNo: string;
	businessType: string;
	createdAt: string;
}

function mapBusinessType(id: number | undefined): string {
	switch (id) {
		case 2:
			return "Sole Prop";
		case 4:
			return "Pty Ltd";
		case 6:
			return "Close Corp";
		case 17:
			return "Trust";
		default:
			return id === undefined ? "" : `Type ${id}`;
	}
}

async function fetchVendorPage(
	token: string,
	baseUrl: string,
	pageIndex: number,
	pageSize: number
): Promise<{ rows: z.infer<typeof VendorRowSchema>[]; totalVendors: number }> {
	const response = await fetch(
		`${baseUrl}vendors/getlist`,
		withProcureCheckProxy({
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				QueryParams: {
					Conditions: [],
					PageIndex: pageIndex,
					PageSize: pageSize,
					SortColumn: "Created",
					SortOrder: "Descending",
				},
			}),
		})
	);

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`ProcureCheck vendors/getlist failed (page ${pageIndex}): ${response.status} ${text}`
		);
	}

	const data = await response.json();
	const normalized = typeof data === "string" ? JSON.parse(data) : data;
	const parsed = VendorListEnvelopeSchema.parse(normalized);
	return {
		rows: parsed.VendorList,
		totalVendors: parsed.TotalVendors,
	};
}

function renderReport(
	environment: string,
	baseUrl: string,
	vendors: AuditVendor[],
	totalScanned: number,
	totalVendors: number
): string {
	const timestamp = new Date().toISOString();
	const lines: string[] = [];

	lines.push("# ProcureCheck test-vendor audit");
	lines.push("");
	lines.push(`- **Generated:** ${timestamp}`);
	lines.push(`- **Environment:** \`${environment}\``);
	lines.push(`- **Base URL:** \`${baseUrl}\``);
	lines.push(`- **Total vendors in sandbox:** ${totalVendors}`);
	lines.push(`- **Total vendors scanned:** ${totalScanned}`);
	lines.push(
		`- **Test vendors (UniqueIdentifier starts with \`STC-\`):** ${vendors.length}`
	);
	lines.push("");
	lines.push("> **WARNING — manual cleanup only.**");
	lines.push(
		"> ProcureCheck has no DELETE endpoint. Delete the vendors below via the ProcureCheck web UI."
	);
	lines.push(
		"> **NEVER delete vendors whose UniqueIdentifier does NOT start with `STC-`** — those belong to StratCol / clients."
	);
	lines.push("");
	if (vendors.length === 0) {
		lines.push("## Vendors to delete");
		lines.push("");
		lines.push("_No `STC-*` test vendors found. Sandbox is clean._");
		lines.push("");
		return lines.join("\n");
	}

	lines.push("## Vendors to delete");
	lines.push("");
	lines.push(
		"| # | Vendor Id (GUID) | UniqueIdentifier | Company (FullName) | Reg. number | Business type | Created |"
	);
	lines.push("|---|---|---|---|---|---|---|");
	vendors.forEach((v, i) => {
		const row = [
			String(i + 1),
			v.vendorId || "—",
			v.externalId || "—",
			v.companyName || "—",
			v.regNo || "—",
			v.businessType || "—",
			v.createdAt || "—",
		]
			.map(cell => cell.replace(/\|/g, "\\|"))
			.join(" | ");
		lines.push(`| ${row} |`);
	});
	lines.push("");

	return lines.join("\n");
}

async function main(): Promise<void> {
	console.info("[ProcureCheck audit] Authenticating…");
	const token = await authenticate();
	const { baseUrl, environment } = getProcureCheckRuntimeConfig();
	console.info(`[ProcureCheck audit] Environment: ${environment}`);
	console.info(`[ProcureCheck audit] Base URL: ${baseUrl}`);

	const pageSize = 100;
	let pageIndex = 0;
	const testVendors: AuditVendor[] = [];
	let totalScanned = 0;
	let totalVendors = 0;

	while (true) {
		const { rows, totalVendors: reportedTotal } = await fetchVendorPage(
			token,
			baseUrl,
			pageIndex,
			pageSize
		);
		if (reportedTotal > 0) totalVendors = reportedTotal;
		if (rows.length === 0) break;

		for (const row of rows) {
			totalScanned += 1;
			const externalId = (row.UniqueIdentifier ?? "").trim();
			if (!externalId.startsWith("STC-")) continue;

			testVendors.push({
				vendorId: row.Id ?? "",
				externalId,
				companyName: row.FullName ?? "",
				regNo: row.IdOrNumber ?? "",
				businessType: mapBusinessType(row.BusinessTypeId),
				createdAt: row.Created ?? "",
			});
		}

		if (totalVendors > 0 && totalScanned >= totalVendors) break;
		if (rows.length < pageSize) break;

		pageIndex += 1;
		// Safety guard against runaway loops if pagination is broken.
		if (pageIndex > 100) {
			console.warn(
				`[ProcureCheck audit] Reached 100-page safety limit at totalScanned=${totalScanned}`
			);
			break;
		}
	}

	console.info(
		`[ProcureCheck audit] Scanned ${totalScanned} / ${totalVendors} vendors; ${testVendors.length} match \`STC-*\`.`
	);

	const report = renderReport(
		environment,
		baseUrl,
		testVendors,
		totalScanned,
		totalVendors
	);

	const artifactDir = resolve(root, "tests/browser-flow/artifacts");
	await mkdir(artifactDir, { recursive: true });
	const reportPath = resolve(artifactDir, "procurecheck-test-vendor-audit.md");
	await writeFile(reportPath, report, "utf8");

	console.info(`[ProcureCheck audit] Report written → ${reportPath}`);
	console.info(
		"[ProcureCheck audit] REMINDER: delete STC-* vendors manually via the ProcureCheck web UI. API has no DELETE endpoint. NEVER delete vendors whose UniqueIdentifier does not start with 'STC-'."
	);
}

main().catch(error => {
	console.error("[ProcureCheck audit] FAILED:", error);
	process.exit(1);
});
