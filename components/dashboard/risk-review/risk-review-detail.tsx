"use client";

import { useState } from "react";
import { generateRiskBriefing } from "@/actions/ai.actions";
import { AiBriefingPanel } from "@/components/dashboard/risk-review/ai-briefing-panel";
import { EntitySummaryCards } from "@/components/dashboard/risk-review/entity-summary-cards";

import { FinalAdjudicationDialog } from "@/components/dashboard/risk-review/final-adjudication-dialog";
import { PrintableAuditReport } from "@/components/dashboard/risk-review/printable-audit-report";
import type { PrimaryRiskTabId } from "@/components/dashboard/risk-review/risk-review-config";
import { RiskReviewHeader } from "@/components/dashboard/risk-review/risk-review-header";
import { RiskReviewTabs } from "@/components/dashboard/risk-review/risk-review-tabs";
import { FicaSection } from "@/components/dashboard/risk-review/sections/fica-section";
import { ItcSection } from "@/components/dashboard/risk-review/sections/itc-section";
import { ProcurementSection } from "@/components/dashboard/risk-review/sections/procurement-section";
import { SanctionsSection } from "@/components/dashboard/risk-review/sections/sanctions-section";
import { getReportExportState } from "@/lib/risk-review/export-readiness";
import type { RiskReviewData } from "@/lib/risk-review/types";

function RiskReviewDetail({ data }: { data: RiskReviewData }) {
	const [primaryTab, setPrimaryTab] = useState<PrimaryRiskTabId>("procurement");
	const [aiSummary, setAiSummary] = useState<string | null>(null);
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [adjudicationOpen, setAdjudicationOpen] = useState(false);

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
	const exportState = getReportExportState(data.sectionStatuses);
	const exportHint = exportState.hasPendingSections
		? `Export becomes available once ${exportState.pendingSections.join(", ")} reach a final status.`
		: exportState.hasDegradedSections
			? `This export includes degraded sections. ${exportState.degradedSections.join(", ")} will be clearly marked in the report.`
			: "Exports the current master compliance report as a print-ready PDF.";

	const handlePrint = () => {
		if (!exportState.canExport) return;
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
			<div className="bg-card  surface-card rounded-3xl text-foreground font-sans p-4 md:p-6 selection:bg-primary/90 print:shadow-none print:p-0 print:m-0 print:hidden print:border-white print:outline-0 w-full print:bg-white print:h-full">
				<div className="space-y-2 w-full print:hidden">
					<RiskReviewHeader
						globalData={globalData}
						isGeneratingSummary={isGeneratingSummary}
						canExport={exportState.canExport}
						exportHint={exportHint}
						onGenerateSummary={handleGenerateSummary}
						onPrint={handlePrint}
						onAdjudicate={() => setAdjudicationOpen(true)}
					/>

					<AiBriefingPanel
						isGeneratingSummary={isGeneratingSummary}
						aiSummary={aiSummary}
						summaryError={summaryError}
					/>

					<EntitySummaryCards globalData={globalData} />

					<RiskReviewTabs activeTab={primaryTab} onTabChange={setPrimaryTab} />

					<div className="mt-6 print:bg-white">
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
							<SanctionsSection
								data={sanctionsData}
								status={data.sectionStatuses?.sanctions}
							/>
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

			<PrintableAuditReport aiSummary={aiSummary} data={data} />

			<FinalAdjudicationDialog
				open={adjudicationOpen}
				onOpenChange={setAdjudicationOpen}
				workflowId={data.workflowId}
				applicantId={data.applicantId}
				entityName={globalData.entity.name}
			/>
		</>
	);
}

export { RiskReviewDetail };
