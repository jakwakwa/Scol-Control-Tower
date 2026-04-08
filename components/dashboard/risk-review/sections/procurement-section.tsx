"use client";

import {
	AlertCircle,
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
import { type ReactNode, useMemo, useState } from "react";
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
import type {
	ProcurementCategoryId,
	ProcurementCheckItem,
	ProcurementData,
} from "@/lib/procurecheck/types";
import type { SectionStatus } from "@/lib/risk-review/types";

type ProcurementTabId = "overallSummary" | ProcurementCategoryId;

const ICON_CLASS = "w-3.5 h-3.5";

const CATEGORY_UI: Record<
	ProcurementCategoryId,
	{ label: string; badgeClass: string; icon: ReactNode }
> = {
	cipc: {
		label: "CIPC",
		badgeClass: "bg-pink-500/15 text-pink-300 border-pink-500/35",
		icon: <Building2 className={ICON_CLASS} aria-hidden="true" />,
	},
	property: {
		label: "Property Information",
		badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/35",
		icon: <House className={ICON_CLASS} aria-hidden="true" />,
	},
	restrictedList: {
		label: "Restricted List",
		badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/35",
		icon: <Ban className={ICON_CLASS} aria-hidden="true" />,
	},
	legal: {
		label: "Legal Matter",
		badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/35",
		icon: <Scale className={ICON_CLASS} aria-hidden="true" />,
	},
	safps: {
		label: "SAFPS",
		badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
		icon: <ShieldCheck className={ICON_CLASS} aria-hidden="true" />,
	},
	persal: {
		label: "Persal",
		badgeClass: "bg-violet-500/15 text-violet-300 border-violet-500/35",
		icon: <Users className={ICON_CLASS} aria-hidden="true" />,
	},
};

const LABEL_TO_CATEGORY_ID = new Map<string, ProcurementCategoryId>(
	Object.entries(CATEGORY_UI).map(([id, { label }]) => [
		label,
		id as ProcurementCategoryId,
	]),
);

function countChecksByStatus(
	checks: ProcurementCheckItem[],
	status: ProcurementCheckItem["status"],
): number {
	return checks.filter((c) => c.status === status).length;
}

function resultVariant(
	result: string,
): "success" | "warning" | "danger" | "default" {
	switch (result) {
		case "CLEARED":
			return "success";
		case "FLAGGED":
			return "danger";
		default:
			return "default";
	}
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="h-12 rounded-lg bg-muted/40 animate-pulse" />
			<div className="flex flex-wrap gap-2">
				{Array.from({ length: 7 }).map((_, i) => (
					<div
						key={`skel-tab-${i}`}
						className="h-8 w-28 rounded-md bg-muted/30 animate-pulse"
					/>
				))}
			</div>
			<div className="rounded-lg border border-border bg-card">
				<div className="p-5 border-b border-border bg-muted/30">
					<div className="h-5 w-48 bg-muted/40 animate-pulse rounded" />
					<div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={`skel-stat-${i}`} className="space-y-2">
								<div className="h-3 w-20 bg-muted/30 animate-pulse rounded" />
								<div className="h-6 w-12 bg-muted/40 animate-pulse rounded" />
							</div>
						))}
					</div>
				</div>
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={`skel-row-${i}`}
						className="flex items-center gap-4 p-4 border-b border-border/50">
						<div className="h-6 w-32 bg-muted/30 animate-pulse rounded-full" />
						<div className="h-4 w-8 bg-muted/20 animate-pulse rounded" />
						<div className="h-4 w-8 bg-muted/20 animate-pulse rounded" />
						<div className="h-4 w-8 bg-muted/20 animate-pulse rounded" />
						<div className="h-4 w-8 bg-muted/20 animate-pulse rounded" />
						<div className="h-6 w-20 bg-muted/30 animate-pulse rounded-full" />
					</div>
				))}
			</div>
		</div>
	);
}

function ErrorCard({ status }: { status: SectionStatus }) {
	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<SectionStatusBanner status={status} label="Procurement" />
			<Card className="p-6">
				<div className="flex items-start gap-3">
					<AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
					<div className="space-y-1">
						<h3 className="font-medium text-foreground">
							{status.machineState === "failed"
								? "Procurement check failed"
								: "Manual review required"}
						</h3>
						<p className="text-sm text-muted-foreground">
							{status.errorDetails ??
								"The procurement verification could not be completed automatically. Please contact the system administrator or retry the check."}
						</p>
					</div>
				</div>
			</Card>
		</div>
	);
}

export function ProcurementSection({
	data,
	status,
}: {
	data: ProcurementData | null;
	status?: SectionStatus;
}) {
	const [activeTab, setActiveTab] = useState<ProcurementTabId>("overallSummary");

	const totals = useMemo(() => {
		if (!data)
			return { tableResults: 0, totalChecks: 0, executedChecks: 0, reviewChecks: 0 };
		const allChecks = data.categories.flatMap((c) => c.checks);
		return {
			tableResults: data.categories.length,
			totalChecks: allChecks.length,
			executedChecks: countChecksByStatus(allChecks, "EXECUTED"),
			reviewChecks: countChecksByStatus(allChecks, "REVIEW"),
		};
	}, [data]);

	if (!data) {
		if (
			status?.machineState === "failed" ||
			status?.machineState === "manual_required"
		) {
			return <ErrorCard status={status} />;
		}
		return <LoadingSkeleton />;
	}

	const activeCategory =
		activeTab === "overallSummary"
			? undefined
			: data.categories.find((c) => c.id === activeTab);

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<SectionStatusBanner status={status} label="Procurement" />

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
								<p className="text-sm text-foreground">{data.vendor.name}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Entity Number</p>
								<p className="text-sm text-foreground">
									{data.vendor.entityNumber}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Entity Type</p>
								<p className="text-sm text-foreground">
									{data.vendor.entityType}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Entity Status</p>
								<p className="text-sm text-foreground">
									{data.vendor.entityStatus}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Start Date</p>
								<p className="text-sm text-foreground">
									{data.vendor.startDate}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">
									Registration Date
								</p>
								<p className="text-sm text-foreground">
									{data.vendor.registrationDate}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Tax Number</p>
								<p className="text-sm text-foreground">
									{data.vendor.taxNumber}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">
									Withdraw From Public
								</p>
								<p className="text-sm text-foreground">
									{data.vendor.withdrawFromPublic}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Postal Address</p>
								<p className="text-sm text-foreground">
									{data.vendor.postalAddress}
								</p>
							</div>
							<div className="sm:col-span-2 lg:col-span-3">
								<p className="text-xs text-muted-foreground">
									Registered Address
								</p>
								<p className="text-sm text-foreground">
									{data.vendor.registeredAddress}
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
				{data.categories.map((category) => (
					<Button
						key={category.id}
						onClick={() => setActiveTab(category.id)}
						variant={activeTab === category.id ? "default" : "outline"}
						className="h-8">
						{CATEGORY_UI[category.id].label}
					</Button>
				))}
			</div>

			{activeTab === "overallSummary" && (
				<Card>
					<div className="p-5 border-b border-border bg-muted/30">
						<div className="flex items-center gap-2 mb-3">
							<ClipboardList className="w-4 h-4 text-primary" />
							<h3 className="font-medium text-foreground">
								Overall Check Summary
							</h3>
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
								<p className="text-xs text-muted-foreground">
									Executed Checks
								</p>
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
								{data.summary.categories.map((row) => {
									const categoryId = LABEL_TO_CATEGORY_ID.get(row.category);
									const ui = categoryId
										? CATEGORY_UI[categoryId]
										: undefined;
									return (
										<tr
											key={row.category}
											className="hover:bg-muted/20 transition-colors">
											<td className="p-4">
												<RiskReviewBadge
													variant="default"
													className={
														ui?.badgeClass ??
														"bg-muted/30 text-foreground border-border"
													}>
													<span className="flex items-center gap-1.5">
														{ui?.icon ?? (
															<FileText
																className={ICON_CLASS}
																aria-hidden="true"
															/>
														)}
														{ui?.label ?? row.category}
													</span>
												</RiskReviewBadge>
											</td>
											<td className="p-4">{row.outstanding}</td>
											<td className="p-4">{row.total}</td>
											<td className="p-4">{row.executed}</td>
											<td className="p-4">{row.review}</td>
											<td className="p-4">
												<RiskReviewBadge
													variant={resultVariant(row.status)}>
													{row.status}
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
							<h3 className="font-medium text-foreground">
								{CATEGORY_UI[activeCategory.id].label}
							</h3>
						</div>
						<p className="text-sm text-muted-foreground">
							{activeCategory.description}
						</p>
						<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
							<span className="font-medium text-foreground">Reviewed:</span>
							{activeCategory.reviewed ? (
								<>
									<ThumbsUp
										className="w-4 h-4 text-chart-4"
										aria-hidden="true"
									/>
									<span className="sr-only">Reviewed yes</span>
								</>
							) : (
								<>
									<ThumbsDown
										className="w-4 h-4 text-destructive"
										aria-hidden="true"
									/>
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
									activeCategory.checks.map((check) => (
										<tr key={`${activeCategory.id}-${check.name}`}>
											<td className="p-4 text-foreground">{check.name}</td>
											<td className="p-4">
												<RiskReviewBadge
													variant={resultVariant(check.result)}>
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
