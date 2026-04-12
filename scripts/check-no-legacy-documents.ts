#!/usr/bin/env bun

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

type Violation = {
	filePath: string;
	line: number;
	text: string;
	pattern: string;
};

const RUNTIME_DIRS = ["app", "lib", "inngest", "components", "db"] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const DISALLOWED_PATTERNS: Array<{ name: string; regex: RegExp }> = [
	{
		name: "legacy-documents-import",
		regex: /import\s*\{[^}]*\bdocuments\b[^}]*\}\s*from\s*["']@\/db\/schema["']/,
	},
	{
		name: "legacy-documents-table-definition",
		regex: /sqliteTable\(\s*["']documents["']/,
	},
	{
		name: "legacy-documents-query-from",
		regex: /\.from\(\s*documents\s*\)/,
	},
	{
		name: "legacy-documents-member-access",
		regex:
			/\bdocuments\.(id|applicantId|type|status|category|source|uploadedAt|processingStatus)\b/,
	},
	{
		name: "legacy-documents-schema-access",
		regex: /\bschema\.documents\b/,
	},
	{
		name: "legacy-documents-relations-usage",
		regex: /\b(many|one)\(\s*documents\s*\)|\brelations\(\s*documents\s*,/,
	},
];

async function main() {
	const rootDir = process.cwd();
	const files = await collectSourceFiles(rootDir);
	const violations: Violation[] = [];

	for (const filePath of files) {
		const content = await readFile(filePath, "utf8");
		const lines = content.split("\n");

		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];
			for (const pattern of DISALLOWED_PATTERNS) {
				if (pattern.regex.test(line)) {
					violations.push({
						filePath: relative(rootDir, filePath),
						line: index + 1,
						text: line.trim(),
						pattern: pattern.name,
					});
				}
			}
		}
	}

	if (violations.length > 0) {
		console.error("Legacy `documents` table usage detected in runtime code:");
		for (const violation of violations) {
			console.error(
				`- [${violation.pattern}] ${violation.filePath}:${violation.line} -> ${violation.text}`
			);
		}
		process.exit(1);
	}

	console.info("No legacy `documents` table references found in runtime code.");
}

async function collectSourceFiles(rootDir: string): Promise<string[]> {
	const collected: string[] = [];

	for (const dir of RUNTIME_DIRS) {
		const absolute = join(rootDir, dir);
		await walkDirectory(absolute, collected);
	}

	return collected;
}

async function walkDirectory(currentPath: string, collected: string[]): Promise<void> {
	const entries = await readdir(currentPath, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		const fullPath = join(currentPath, entry.name);

		if (entry.isDirectory()) {
			await walkDirectory(fullPath, collected);
			continue;
		}

		for (const ext of SOURCE_EXTENSIONS) {
			if (entry.name.endsWith(ext)) {
				collected.push(fullPath);
				break;
			}
		}
	}
}

void main();
