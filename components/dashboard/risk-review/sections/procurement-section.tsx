"use client";

import {
	Ban,
	Building2,
	ClipboardList,
	FileText,
	House,
	Scale,
	ShieldCheck,
	ThumbsDown,
	ThumbsUp,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import { SectionStatusBanner } from "@/components/dashboard/risk-review/section-status-banner";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";

type ProcurementCategoryTabId =
	| "cipc"
	| "propertyInformation"
	| "restrictedList"
	| "legalMatter"
	| "safps"
	| "persal";
type ProcurementTabId = "overallSummary" | ProcurementCategoryTabId;

type CheckResult = "CLEARED" | "FLAGGED" | "UNKNOWN";
type CheckExecutionStatus = "EXECUTED" | "REVIEW" | "PENDING";

interface ProcurementCheckItem {
	name: string;
	status: CheckExecutionStatus;
	result: CheckResult;
}

interface ProcurementCategory {
	tabId: ProcurementCategoryTabId;
	label: string;
	description: string;
	reviewed: boolean;
	checks: ProcurementCheckItem[];
}

interface ProcurementApplicantDetails {
	name: string;
	entityNumber: string;
	entityType: string;
	entityStatus: string;
	startDate: string;
	registrationDate: string;
	taxNumber: string;
	withdrawFromPublic: string;
	postalAddress: string;
	registeredAddress: string;
}

interface ProcurementUiData {
	applicant: ProcurementApplicantDetails;
	categories: ProcurementCategory[];
}

type ExtendedProcurementData = RiskReviewData["procurementData"] & {
	applicant?: ProcurementApplicantDetails;
	cipc?: {
		description?: string;
		reviewed?: boolean | string;
		checks?: ProcurementCheckItem[];
	};
	property?: {
		description?: string;
		reviewed?: boolean | string;
		checks?: ProcurementCheckItem[];
	};
	restrictedList?: {
		description?: string;
		reviewed?: boolean | string;
		checks?: ProcurementCheckItem[];
	};
	legal?: {
		description?: string;
		reviewed?: boolean | string;
		checks?: ProcurementCheckItem[];
	};
	safps?: {
		description?: string;
		reviewed?: boolean | string;
		checks?: ProcurementCheckItem[];
	};
	persal?: {
		description?: string;
		reviewed?: boolean | string;
		checks?: ProcurementCheckItem[];
	};
};

interface CategoryDefinition {
	tabId: ProcurementCategoryTabId;
	label: string;
	key: string;
	description: string;
	fallbackChecks: string[];
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
	{
		tabId: "cipc",
		label: "CIPC",
		key: "cipc",
		description: "Checks company registration and CIPC standing for the vendor.",
		fallbackChecks: [
			"Vendor name matches Company Registration at CIPC",
			"No directors of vendor are listed as active employees",
			"No directors of vendor have Next Of Kin listed as active employees",
			"No directors of vendor are active directors of any other companies linked to employees",
			"No directors of vendor are directors of any other active vendor",
			"No director of vendor are listed as inactive employees",
			"Vendor business status matches CIPC",
		],
	},
	{
		tabId: "propertyInformation",
		label: "Property Information",
		key: "property",
		description:
			"Checks property transactions between vendor directors and employees for any direct or family co-ownership.",
		fallbackChecks: [
			"No vendor director has purchased property from an active employee",
			"No vendor director has sold property to an active employee",
			"No vendor director co-owns property with an active employee",
			"No vendor director has a Next Of Kin who co-owns a property with an active vendor",
		],
	},
	{
		tabId: "restrictedList",
		label: "Restricted List",
		key: "restrictedList",
		description: "Checks if vendor directors are on the restricted list.",
		fallbackChecks: [
			"Vendor was not found on Internal Restricted List",
			"No vendor directors also direct an internally listed Restricted vendor",
			"No vendor directors are found on internal Restricted employee list",
			"Vendor was not found on National Treasury Restricted list",
			"No vendor directors are directors of other companies found in National Treasury Restricted list",
			"No vendor directors are found in the National Treasury Restricted list",
		],
	},
	{
		tabId: "legalMatter",
		label: "Legal Matter",
		key: "legal",
		description: "Checks if vendor directors are cited in legal matter.",
		fallbackChecks: ["Vendor not cited in legal matter"],
	},
	{
		tabId: "safps",
		label: "SAFPS",
		key: "safps",
		description: "Checks if vendor directors are on the SAFPS list.",
		fallbackChecks: ["Vendor passed SAFPS checks"],
	},
	{
		tabId: "persal",
		label: "Persal",
		key: "persal",
		description: "Checks if vendor directors are on the Persal list.",
		fallbackChecks: ["No match was found for the specific information searched"],
	},
];

const DEFAULT_APPLICANT: ProcurementApplicantDetails = {
	name: "—",
	entityNumber: "—",
	entityType: "—",
	entityStatus: "—",
	startDate: "—",
	registrationDate: "—",
	taxNumber: "—",
	withdrawFromPublic: "—",
	postalAddress: "—",
	registeredAddress: "—",
};

const PROCURECHECK_MOCK_DATA: ExtendedProcurementData = {
	cipcStatus: "Verified",
	taxStatus: "Compliant",
	taxExpiry: "2027-11-30",
	beeLevel: "Level 2",
	beeExpiry: "2027-08-14",
	riskAlerts: [],
	checks: [],
	directors: [],
	applicant: {
		name: "Acme Procurement Holdings (Pty) Ltd",
		entityNumber: "2019/123456/07",
		entityType: "Private Company",
		entityStatus: "Active",
		startDate: "2019-05-12",
		registrationDate: "2019-05-12",
		taxNumber: "9045123456",
		withdrawFromPublic: "No",
		postalAddress: "PO Box 4891, Cape Town, 8000",
		registeredAddress: "22 Loop Street, Cape Town, 8001",
	},
	cipc: {
		description: "Checks company registration and CIPC standing for the vendor.",
		reviewed: true,
		checks: [
			{
				name: "Vendor name matches Company Registration at CIPC",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No directors of vendor are listed as active employees",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No directors of vendor have Next Of Kin listed as active employees",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No directors of vendor are active directors of any other companies linked to employees",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No directors of vendor are directors of any other active vendor",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No director of vendor are listed as inactive employees",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "Vendor business status matches CIPC",
				status: "EXECUTED",
				result: "CLEARED",
			},
		],
	},
	property: {
		description:
			"Checks property transactions between vendor directors and employees for any direct or family co-ownership.",
		reviewed: true,
		checks: [
			{
				name: "No vendor director has purchased property from an active employee",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No vendor director has sold property to an active employee",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No vendor director co-owns property with an active employee",
				status: "REVIEW",
				result: "UNKNOWN",
			},
			{
				name: "No vendor director has a Next Of Kin who co-owns a property with an active vendor",
				status: "REVIEW",
				result: "UNKNOWN",
			},
		],
	},
	restrictedList: {
		description: "Checks if vendor directors are on the restricted list.",
		reviewed: true,
		checks: [
			{
				name: "Vendor was not found on Internal Restricted List",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No vendor directors also direct an internally listed Restricted vendor",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No vendor directors are found on internal Restricted employee list",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "Vendor was not found on National Treasury Restricted list",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No vendor directors are directors of other companies found in National Treasury Restricted list",
				status: "EXECUTED",
				result: "CLEARED",
			},
			{
				name: "No vendor directors are found in the National Treasury Restricted list",
				status: "EXECUTED",
				result: "CLEARED",
			},
		],
	},
	legal: {
		description: "Checks if vendor directors are cited in legal matter.",
		reviewed: true,
		checks: [
			{
				name: "Vendor not cited in legal matter",
				status: "EXECUTED",
				result: "CLEARED",
			},
		],
	},
	safps: {
		description: "Checks if vendor directors are on the SAFPS list.",
		reviewed: true,
		checks: [
			{
				name: "Vendor passed SAFPS checks",
				status: "EXECUTED",
				result: "CLEARED",
			},
		],
	},
	persal: {
		description: "Checks if vendor directors are on the Persal list.",
		reviewed: true,
		checks: [
			{
				name: "No match was found for the specific information searched",
				status: "EXECUTED",
				result: "CLEARED",
			},
		],
	},
};

function parseBooleanFlag(value: string | undefined): boolean {
	if (!value) return false;
	const normalized = value.trim().toLowerCase();
	return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseReviewedValue(value: unknown): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") return parseBooleanFlag(value);
	return true;
}

const PROCURECHECK_MOCK_ENABLED = parseBooleanFlag(
	process.env.NEXT_PUBLIC_PROCURECHECK_MOCK_ENABLED ??
		process.env.PROCURECHECK_MOCK_ENABLED
);

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}
	return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function normalizeExecutionStatus(value: unknown): CheckExecutionStatus {
	const normalized = String(value ?? "")
		.trim()
		.toUpperCase();

	if (
		normalized === "EXECUTED" ||
		normalized === "PASS" ||
		normalized === "PASSED" ||
		normalized === "COMPLETED"
	) {
		return "EXECUTED";
	}

	if (normalized === "REVIEW" || normalized === "MANUAL_REVIEW") {
		return "REVIEW";
	}

	return "PENDING";
}

function normalizeResult(result: unknown, status: unknown): CheckResult {
	const source = `${String(result ?? "")} ${String(status ?? "")}`.trim().toUpperCase();

	if (
		source.includes("FLAG") ||
		source.includes("FAIL") ||
		source.includes("MATCH") ||
		source.includes("HIT")
	) {
		return "FLAGGED";
	}

	if (
		source.includes("CLEAR") ||
		source.includes("PASS") ||
		source.includes("NOT FOUND") ||
		source.includes("NO MATCH") ||
		source.includes("VERIFIED")
	) {
		return "CLEARED";
	}

	return "UNKNOWN";
}

function inferFallbackResult(checkName: string): CheckResult {
	const value = checkName.toLowerCase();
	if (
		value.startsWith("no ") ||
		value.includes("not ") ||
		value.includes("passed") ||
		value.includes("active")
	) {
		return "CLEARED";
	}
	return "UNKNOWN";
}

function parseCheckItem(value: unknown): ProcurementCheckItem | null {
	const parsed = asRecord(value);
	if (!parsed) return null;

	const name =
		asString(parsed.name) ??
		asString(parsed.check) ??
		asString(parsed.checkName) ??
		asString(parsed.title);
	if (!name) return null;

	const status = normalizeExecutionStatus(parsed.status);
	const result = normalizeResult(parsed.result, parsed.status);

	return { name, status, result };
}

function parseApplicant(
	data: RiskReviewData["procurementData"]
): ProcurementApplicantDetails {
	const source = asRecord(data as unknown);
	const applicant = asRecord(source?.applicant);
	if (!applicant) return DEFAULT_APPLICANT;

	return {
		name: asString(applicant.name) ?? DEFAULT_APPLICANT.name,
		entityNumber:
			asString(applicant.entityNumber) ??
			asString(applicant.registrationNumber) ??
			DEFAULT_APPLICANT.entityNumber,
		entityType: asString(applicant.entityType) ?? DEFAULT_APPLICANT.entityType,
		entityStatus: asString(applicant.entityStatus) ?? DEFAULT_APPLICANT.entityStatus,
		startDate: asString(applicant.startDate) ?? DEFAULT_APPLICANT.startDate,
		registrationDate:
			asString(applicant.registrationDate) ?? DEFAULT_APPLICANT.registrationDate,
		taxNumber: asString(applicant.taxNumber) ?? DEFAULT_APPLICANT.taxNumber,
		withdrawFromPublic:
			asString(applicant.withdrawFromPublic) ?? DEFAULT_APPLICANT.withdrawFromPublic,
		postalAddress: asString(applicant.postalAddress) ?? DEFAULT_APPLICANT.postalAddress,
		registeredAddress:
			asString(applicant.registeredAddress) ?? DEFAULT_APPLICANT.registeredAddress,
	};
}

function mapLegacyChecks(
	data: RiskReviewData["procurementData"]
): ProcurementCheckItem[] {
	return data.checks
		.map(check => {
			const name = check.name.trim();
			if (!name) return null;
			const status = normalizeExecutionStatus(check.status);
			const result = normalizeResult(undefined, check.status);
			return { name, status, result };
		})
		.filter((check): check is ProcurementCheckItem => check !== null);
}

function parseCategoryChecks(
	data: RiskReviewData["procurementData"],
	definition: CategoryDefinition
): ProcurementCheckItem[] {
	const source = asRecord(data as unknown);
	const category = asRecord(source?.[definition.key]);
	const parsedChecks = asArray(category?.checks)
		.map(parseCheckItem)
		.filter((check): check is ProcurementCheckItem => check !== null);

	if (parsedChecks.length > 0) {
		return parsedChecks;
	}

	if (definition.tabId === "cipc") {
		const legacyChecks = mapLegacyChecks(data);
		if (legacyChecks.length > 0) {
			return legacyChecks;
		}
	}

	return definition.fallbackChecks.map(checkName => ({
		name: checkName,
		status: "PENDING",
		result: inferFallbackResult(checkName),
	}));
}

function normalizeProcurementUiData(
	data: RiskReviewData["procurementData"]
): ProcurementUiData {
	const source = asRecord(data as unknown);

	const categories = CATEGORY_DEFINITIONS.map(definition => {
		const categorySource = asRecord(source?.[definition.key]);
		const description = asString(categorySource?.description) ?? definition.description;
		const reviewed = parseReviewedValue(
			categorySource?.reviewed ?? categorySource?.isReviewed
		);
		const checks = parseCategoryChecks(data, definition);

		return {
			tabId: definition.tabId,
			label: definition.label,
			description,
			reviewed,
			checks,
		};
	});

	return {
		applicant: parseApplicant(data),
		categories,
	};
}

function countChecksByStatus(
	checks: ProcurementCheckItem[],
	status: CheckExecutionStatus
): number {
	return checks.filter(check => check.status === status).length;
}

function getCategoryResult(checks: ProcurementCheckItem[]): CheckResult {
	if (checks.some(check => check.result === "FLAGGED")) return "FLAGGED";
	if (checks.length > 0 && checks.every(check => check.result === "CLEARED"))
		return "CLEARED";
	return "UNKNOWN";
}

function getOutstandingChecksCount(checks: ProcurementCheckItem[]): number {
	return checks.filter(check => check.result !== "CLEARED").length;
}

function resultVariant(
	result: CheckResult
): "success" | "warning" | "danger" | "default" {
	switch (result) {
		case "CLEARED":
			return "success";
		case "FLAGGED":
			return "danger";
		case "UNKNOWN":
		default:
			return "default";
	}
}

function categoryBadgeClass(tabId: ProcurementCategoryTabId): string {
	switch (tabId) {
		case "cipc":
			return "bg-pink-500/15 text-pink-300 border-pink-500/35";
		case "propertyInformation":
			return "bg-sky-500/15 text-sky-300 border-sky-500/35";
		case "restrictedList":
			return "bg-amber-500/15 text-amber-300 border-amber-500/35";
		case "legalMatter":
			return "bg-orange-500/15 text-orange-300 border-orange-500/35";
		case "safps":
			return "bg-emerald-500/15 text-emerald-300 border-emerald-500/35";
		case "persal":
			return "bg-violet-500/15 text-violet-300 border-violet-500/35";
		default:
			return "bg-muted/30 text-foreground border-border";
	}
}

function categoryBadgeIcon(tabId: ProcurementCategoryTabId) {
	const iconClass = "w-3.5 h-3.5";
	switch (tabId) {
		case "cipc":
			return <Building2 className={iconClass} aria-hidden="true" />;
		case "propertyInformation":
			return <House className={iconClass} aria-hidden="true" />;
		case "restrictedList":
			return <Ban className={iconClass} aria-hidden="true" />;
		case "legalMatter":
			return <Scale className={iconClass} aria-hidden="true" />;
		case "safps":
			return <ShieldCheck className={iconClass} aria-hidden="true" />;
		case "persal":
			return <Users className={iconClass} aria-hidden="true" />;
		default:
			return <FileText className={iconClass} aria-hidden="true" />;
	}
}

export function ProcurementSection({
	data,
	status,
}: {
	data: RiskReviewData["procurementData"];
	status?: SectionStatus;
}) {
	const [activeTab, setActiveTab] = useState<ProcurementTabId>("overallSummary");

	const sourceData = PROCURECHECK_MOCK_ENABLED ? PROCURECHECK_MOCK_DATA : data;
	const uiData = useMemo(() => normalizeProcurementUiData(sourceData), [sourceData]);

	const totals = useMemo(() => {
		const allChecks = uiData.categories.flatMap(category => category.checks);
		return {
			tableResults: uiData.categories.length,
			totalChecks: allChecks.length,
			executedChecks: countChecksByStatus(allChecks, "EXECUTED"),
			reviewChecks: countChecksByStatus(allChecks, "REVIEW"),
		};
	}, [uiData]);

	const activeCategory =
		activeTab === "overallSummary"
			? undefined
			: (uiData.categories.find(category => category.tabId === activeTab) ??
				uiData.categories[0]);

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<SectionStatusBanner status={status} label="Procurement" />

			{PROCURECHECK_MOCK_ENABLED && (
				<RiskReviewBadge variant="warning">
					Mock data enabled (PROCURECHECK_MOCK_ENABLED)
				</RiskReviewBadge>
			)}

			<Accordion type="single" collapsible className="border-border bg-card">
				<AccordionItem value="applicant-details" className="data-open:bg-transparent">
					<AccordionTrigger className="hover:bg-muted/20 px-5">
						<span className="flex items-center gap-2">
							<Building2 className="w-4 h-4 text-primary" />
							<span className="font-medium text-foreground">Vendor Detail</span>
						</span>
					</AccordionTrigger>
					<AccordionContent className="px-5 pb-5">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							<div>
								<p className="text-xs text-muted-foreground">Name</p>
								<p className="text-sm text-foreground">{uiData.applicant.name}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Entity Number</p>
								<p className="text-sm text-foreground">{uiData.applicant.entityNumber}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Entity Type</p>
								<p className="text-sm text-foreground">{uiData.applicant.entityType}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Entity Status</p>
								<p className="text-sm text-foreground">{uiData.applicant.entityStatus}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Start Date</p>
								<p className="text-sm text-foreground">{uiData.applicant.startDate}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Registration Date</p>
								<p className="text-sm text-foreground">
									{uiData.applicant.registrationDate}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Tax Number</p>
								<p className="text-sm text-foreground">{uiData.applicant.taxNumber}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Withdraw From Public</p>
								<p className="text-sm text-foreground">
									{uiData.applicant.withdrawFromPublic}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Postal Address</p>
								<p className="text-sm text-foreground">
									{uiData.applicant.postalAddress}
								</p>
							</div>
							<div className="sm:col-span-2 lg:col-span-3">
								<p className="text-xs text-muted-foreground">Registered Address</p>
								<p className="text-sm text-foreground">
									{uiData.applicant.registeredAddress}
								</p>
							</div>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<div className="flex flex-wrap items-center gap-2">
				<Button
					onClick={() => setActiveTab("overallSummary")}
					variant={activeTab === "overallSummary" ? "default" : "outline"}
					className="h-8">
					Overall Summary
				</Button>
				{uiData.categories.map(category => (
					<Button
						key={category.tabId}
						onClick={() => setActiveTab(category.tabId)}
						variant={activeTab === category.tabId ? "default" : "outline"}
						className="h-8">
						{category.label}
					</Button>
				))}
			</div>

			{activeTab === "overallSummary" && (
				<Card>
					<div className="p-5 border-b border-border bg-muted/30">
						<div className="flex items-center gap-2 mb-3">
							<ClipboardList className="w-4 h-4 text-primary" />
							<h3 className="font-medium text-foreground">Overall Check Summary</h3>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div>
								<p className="text-xs text-muted-foreground">Table Results</p>
								<p className="text-lg font-semibold text-foreground">
									{totals.tableResults}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Total Checks</p>
								<p className="text-lg font-semibold text-foreground">
									{totals.totalChecks}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Executed Checks</p>
								<p className="text-lg font-semibold text-foreground">
									{totals.executedChecks}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Review Checks</p>
								<p className="text-lg font-semibold text-foreground">
									{totals.reviewChecks}
								</p>
							</div>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse bg-card">
							<thead>
								<tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
									<th className="p-4 font-medium">Category</th>
									<th className="p-4 font-medium">Outstanding Checks</th>
									<th className="p-4 font-medium">Total Checks</th>
									<th className="p-4 font-medium">Executed Checks</th>
									<th className="p-4 font-medium">Review Checks</th>
									<th className="p-4 font-medium">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/50 text-sm">
								{uiData.categories.map(category => {
									const categoryStatus = getCategoryResult(category.checks);
									return (
										<tr
											key={category.tabId}
											className="hover:bg-muted/20 transition-colors">
											<td className="p-4">
												<RiskReviewBadge
													variant="default"
													className={categoryBadgeClass(category.tabId)}>
													<span className="flex items-center gap-1.5">
														{categoryBadgeIcon(category.tabId)}
														{category.label}
													</span>
												</RiskReviewBadge>
											</td>
											<td className="p-4">
												{getOutstandingChecksCount(category.checks)}
											</td>
											<td className="p-4">{category.checks.length}</td>
											<td className="p-4">
												{countChecksByStatus(category.checks, "EXECUTED")}
											</td>
											<td className="p-4">
												{countChecksByStatus(category.checks, "REVIEW")}
											</td>
											<td className="p-4">
												<RiskReviewBadge variant={resultVariant(categoryStatus)}>
													{categoryStatus}
												</RiskReviewBadge>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</Card>
			)}

			{activeCategory && activeTab !== "overallSummary" && (
				<Card>
					<div className="p-5 border-b border-border bg-muted/20">
						<div className="flex items-center gap-2 mb-2">
							<FileText className="w-4 h-4 text-primary" />
							<h3 className="font-medium text-foreground">{activeCategory.label}</h3>
						</div>
						<p className="text-sm text-muted-foreground">{activeCategory.description}</p>
						<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
							<span className="font-medium text-foreground">Reviewed:</span>
							{activeCategory.reviewed ? (
								<>
									<ThumbsUp className="w-4 h-4 text-chart-4" aria-hidden="true" />
									<span className="sr-only">Reviewed yes</span>
								</>
							) : (
								<>
									<ThumbsDown className="w-4 h-4 text-destructive" aria-hidden="true" />
									<span className="sr-only">Reviewed no</span>
								</>
							)}
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse bg-card">
							<thead>
								<tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
									<th className="p-4 font-medium">Checks</th>
									<th className="p-4 font-medium">Result</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/50 text-sm">
								{activeCategory.checks.length === 0 ? (
									<tr>
										<td className="p-4 text-muted-foreground" colSpan={2}>
											No checks available yet.
										</td>
									</tr>
								) : (
									activeCategory.checks.map(check => (
										<tr key={`${activeCategory.tabId}-${check.name}`}>
											<td className="p-4 text-foreground">{check.name}</td>
											<td className="p-4">
												<RiskReviewBadge variant={resultVariant(check.result)}>
													{check.result}
												</RiskReviewBadge>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</Card>
			)}
		</div>
	);
}
