"use client";

import { useState } from "react";
import { generateRiskBriefing } from "@/actions/ai.actions";
import { AiBriefingPanel } from "@/components/dashboard/risk-review/ai-briefing-panel";
import { EntitySummaryCards } from "@/components/dashboard/risk-review/entity-summary-cards";
import { ExternalScreeningPanel } from "@/components/dashboard/risk-review/external-screening-panel";
import { PrintableAuditReport } from "@/components/dashboard/risk-review/printable-audit-report";
import type { PrimaryRiskTabId } from "@/components/dashboard/risk-review/risk-review-config";
import { RiskReviewHeader } from "@/components/dashboard/risk-review/risk-review-header";
import { RiskReviewTabs } from "@/components/dashboard/risk-review/risk-review-tabs";
import { FicaSection } from "@/components/dashboard/risk-review/sections/fica-section";
import { ItcSection } from "@/components/dashboard/risk-review/sections/itc-section";
import { ProcurementSection } from "@/components/dashboard/risk-review/sections/procurement-section";
import { SanctionsSection } from "@/components/dashboard/risk-review/sections/sanctions-section";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	OVERRIDE_CATEGORIES,
	OVERRIDE_CATEGORY_LABELS,
	type OverrideCategory,
} from "@/lib/constants/override-taxonomy";
import type { RiskReviewData } from "@/lib/risk-review/types";

function RiskReviewDetail({ data }: { data: RiskReviewData }) {
	const [primaryTab, setPrimaryTab] = useState<PrimaryRiskTabId>("procurement");
	const [aiSummary, setAiSummary] = useState<string | null>(null);
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [adjudicationOpen, setAdjudicationOpen] = useState(false);
	const [adjudicationReason, setAdjudicationReason] = useState("");
	const [overrideCategory, setOverrideCategory] =
		useState<OverrideCategory>("AI_ALIGNED");
	const [adjudicationSubmitting, setAdjudicationSubmitting] = useState(false);
	const [adjudicationResult, setAdjudicationResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	if (!data?.globalData) {
		return (
			<div className="p-8 text-center text-muted-foreground">Loading risk data...</div>
		);
	}

	const {
		globalData,
		procurementData,
		itcData,
		sanctionsData,
		ficaData,
		bankStatementAnalysis,
	} = data;

	const handleAdjudicate = async (outcome: "APPROVED" | "REJECTED") => {
		setAdjudicationSubmitting(true);
		setAdjudicationResult(null);
		try {
			const res = await fetch("/api/risk-decision", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId: data.workflowId,
					applicantId: data.applicantId,
					decision: {
						outcome,
						reason: adjudicationReason || undefined,
						overrideCategory,
					},
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				setAdjudicationResult({
					success: false,
					message: json.error || "Request failed",
				});
				return;
			}
			setAdjudicationResult({
				success: true,
				message: `Risk decision recorded: ${outcome}`,
			});
			setTimeout(() => setAdjudicationOpen(false), 1500);
		} catch (err) {
			setAdjudicationResult({
				success: false,
				message: err instanceof Error ? err.message : "Network error",
			});
		} finally {
			setAdjudicationSubmitting(false);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	const handleGenerateSummary = async () => {
		setIsGeneratingSummary(true);
		setSummaryError(null);

		const dataContext = `
      Entity: ${JSON.stringify(globalData.entity)}
      Overall Score: ${globalData.overallRiskScore}
      Procurement Data: ${JSON.stringify(procurementData)}
      ITC Data: ${JSON.stringify(itcData)}
      Bank statement AI: ${JSON.stringify(bankStatementAnalysis ?? null)}
      Sanctions Data: ${JSON.stringify(sanctionsData)}
      FICA Data: ${JSON.stringify(ficaData)}
    `;

		try {
			const result = await generateRiskBriefing(dataContext);
			setAiSummary(result);
		} catch (error) {
			const err = error as Error;
			setSummaryError(err.message || "Failed to generate AI insights. Please try again.");
		} finally {
			setIsGeneratingSummary(false);
		}
	};

	return (
		<>
			<div className="card-form text-foreground font-sans p-4 md:p-6 selection:bg-primary/90 print:hidden w-full">
				<div className="space-y-2 w-full">
					<RiskReviewHeader
						globalData={globalData}
						isGeneratingSummary={isGeneratingSummary}
						onGenerateSummary={handleGenerateSummary}
						onPrint={handlePrint}
						onAdjudicate={() => {
							setAdjudicationReason("");
							setAdjudicationResult(null);
							setAdjudicationOpen(true);
						}}
					/>

					<AiBriefingPanel
						isGeneratingSummary={isGeneratingSummary}
						aiSummary={aiSummary}
						summaryError={summaryError}
					/>

					<EntitySummaryCards globalData={globalData} />

					<RiskReviewTabs activeTab={primaryTab} onTabChange={setPrimaryTab} />

					<div className="mt-6">
						{primaryTab === "procurement" && (
							<ProcurementSection
								data={procurementData}
								status={data.sectionStatuses?.procurement}
							/>
						)}
						{primaryTab === "itc" && (
							<ItcSection
								data={itcData}
								status={data.sectionStatuses?.itc}
								bankStatementAnalysis={bankStatementAnalysis}
							/>
						)}
						{primaryTab === "sanctions" && (
							<div className="space-y-8">
								<SanctionsSection
									data={sanctionsData}
									status={data.sectionStatuses?.sanctions}
								/>
								{(data.externalScreeningUi.industryRegulator ||
									data.externalScreeningUi.socialReputation) && (
									<ExternalScreeningPanel
										applicantId={data.applicantId}
										industryInitial={data.industryRegulatorCheck}
										socialInitial={data.socialReputationCheck}
										ui={data.externalScreeningUi}
									/>
								)}
							</div>
						)}
						{primaryTab === "fica" && (
							<FicaSection
								data={ficaData}
								status={data.sectionStatuses?.fica}
								applicantId={data.applicantId}
							/>
						)}
					</div>
				</div>
			</div>

			<div className="hidden">
				<PrintableAuditReport aiSummary={aiSummary} data={data} />
			</div>

			<Dialog open={adjudicationOpen} onOpenChange={setAdjudicationOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Final Adjudication</DialogTitle>
						<DialogDescription>
							Submit your risk manager decision for {globalData.entity.name}. This will
							advance the workflow.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="override-category">Override Category</Label>
							<Select
								value={overrideCategory}
								onValueChange={value => setOverrideCategory(value as OverrideCategory)}
								disabled={adjudicationSubmitting}>
								<SelectTrigger id="override-category" className="w-full">
									<SelectValue placeholder="Select override category" />
								</SelectTrigger>
								<SelectContent>
									{OVERRIDE_CATEGORIES.map(cat => (
										<SelectItem key={cat} value={cat}>
											{OVERRIDE_CATEGORY_LABELS[cat]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="adjudication-reason">Reason / Notes</Label>
							<Textarea
								id="adjudication-reason"
								className="min-h-[100px]"
								placeholder="Provide your rationale for the decision..."
								value={adjudicationReason}
								onChange={e => setAdjudicationReason(e.target.value)}
								disabled={adjudicationSubmitting}
							/>
						</div>
					</div>

					{adjudicationResult && (
						<p
							className={`text-sm font-medium ${adjudicationResult.success ? "text-green-600" : "text-destructive"}`}>
							{adjudicationResult.message}
						</p>
					)}

					<DialogFooter>
						<Button
							variant="destructive"
							disabled={adjudicationSubmitting}
							onClick={() => handleAdjudicate("REJECTED")}>
							{adjudicationSubmitting ? "Submitting..." : "Reject"}
						</Button>
						<Button
							variant="default"
							disabled={adjudicationSubmitting}
							onClick={() => handleAdjudicate("APPROVED")}>
							{adjudicationSubmitting ? "Submitting..." : "Approve"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export { RiskReviewDetail };
