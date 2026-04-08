#!/usr/bin/env bun
/**
 * Validates PDFs from verify-refactor.sh: magic bytes, min size, indirect object count
 * (Chromium packs text in streams so substring checks are unreliable).
 */
import { readFileSync } from "node:fs";

const [, , ccPdfPath, procPdfPath, vendorId] = process.argv;

if (!(ccPdfPath && procPdfPath)) {
	console.error(
		"Usage: verify-export-pdfs.ts <credit-compliance.pdf> <procurement.pdf> [vendorId]"
	);
	process.exit(2);
}

const MIN_SIZE_BYTES = 50_000;
const MIN_PDF_OBJECT_COUNT = 30;

interface AssertionResult {
	file: string;
	passed: boolean;
	failures: string[];
}

function assertPdf(label: string, pdfPath: string): AssertionResult {
	const failures: string[] = [];

	let buf: Buffer;
	try {
		buf = readFileSync(pdfPath);
	} catch {
		return {
			file: pdfPath,
			passed: false,
			failures: [`File does not exist or is unreadable: ${pdfPath}`],
		};
	}

	const size = buf.byteLength;
	if (size === 0) {
		failures.push("File is empty (0 bytes)");
	}

	const magic = buf.subarray(0, 5).toString("ascii");
	if (magic !== "%PDF-") {
		failures.push(`Invalid PDF header: expected "%PDF-", got "${magic}"`);
	}

	if (size < MIN_SIZE_BYTES) {
		failures.push(
			`PDF is too small (${size} bytes < ${MIN_SIZE_BYTES} threshold). ` +
				"Likely a blank or near-blank export — the printable component may not have rendered."
		);
	}

	const raw = buf.toString("latin1");
	const objMatches = raw.match(/\d+ \d+ obj/g);
	const objCount = objMatches?.length ?? 0;

	if (objCount < MIN_PDF_OBJECT_COUNT) {
		failures.push(
			`PDF has only ${objCount} objects (minimum ${MIN_PDF_OBJECT_COUNT}). ` +
				"Likely blank or near-blank."
		);
	}

	const passed = failures.length === 0;
	const objectSummary =
		objCount >= MIN_PDF_OBJECT_COUNT
			? `object count: ${objCount}`
			: `object count: ${objCount} (below minimum)`;

	console.info(
		`  ${passed ? "✓" : "✗"} ${label} — ${size.toLocaleString()} bytes, ${objectSummary}`
	);
	if (!passed) {
		for (const f of failures) {
			console.info(`      FAIL: ${f}`);
		}
	}

	return { file: pdfPath, passed, failures };
}

console.info("");
console.info("=== PDF export assertions ===");
console.info(`  Vendor ID (bypass): ${vendorId ?? "(not provided)"}`);
console.info("");

const ccResult = assertPdf("Credit & Compliance", ccPdfPath);
const procResult = assertPdf("Procurement", procPdfPath);

console.info("");

const allPassed = ccResult.passed && procResult.passed;
if (allPassed) {
	console.info("=== PDF assertions PASSED ===");
	console.info("");
} else {
	console.info("=== PDF assertions FAILED ===");
	console.info("");
	process.exit(1);
}
