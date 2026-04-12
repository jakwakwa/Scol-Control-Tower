"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { generateRiskBriefing } from "@/actions/ai.actions";
import { AiBriefingPanel } from "@/components/dashboard/risk-review/ai-briefing-panel";
import { EntitySummaryCards } from "@/components/dashboard/risk-review/entity-summary-cards";
import { FinalAdjudicationDialog } from "@/components/dashboard/risk-review/final-adjudication-dialog";
import { PrintableCreditComplianceReport } from "@/components/dashboard/risk-review/printable-credit-compliance-report";
import { PrintableProcurementReport } from "@/components/dashboard/risk-review/printable-procurement-report";
import { ProcurementAdjudicationDialog } from "@/components/dashboard/risk-review/procurement-adjudication-dialog";
import type { PrimaryRiskTabId } from "@/components/dashboard/risk-review/risk-review-config";
import { RiskReviewHeader } from "@/components/dashboard/risk-review/risk-review-header";
import { RiskReviewTabs } from "@/components/dashboard/risk-review/risk-review-tabs";
import { FicaSection } from "@/components/dashboard/risk-review/sections/fica-section";
import { ItcSection } from "@/components/dashboard/risk-review/sections/itc-section";
import { ProcurementSection } from "@/components/dashboard/risk-review/sections/procurement-section";
import { SanctionsSection } from "@/components/dashboard/risk-review/sections/sanctions-section";
import {
	getCreditComplianceExportState,
	getProcurementExportState,
} from "@/lib/risk-review/export-readiness";
import {
	type PrintMode,
	parsePrintModeParam,
} from "@/lib/risk-review/print-mode-from-params";
import type { RiskReviewData } from "@/lib/risk-review/types";

function buildExportHint(args: {
	label: string;
	canExport: boolean;
	hasPendingSections: boolean;
	pendingSections: string[];
	hasDegradedSections: boolean;
	degradedSections: string[];
}): string {
	if (args.hasPendingSections) {
		return `${args.label} export becomes available once ${args.pendingSections.join(", ")} reach a final status.`;
	}
	if (args.hasDegradedSections) {
		return `${args.label} export includes degraded sections. ${args.degradedSections.join(", ")} will be clearly marked in the report.`;
	}
	return `${args.label} is ready to export as a print-ready PDF.`;
}

function RiskReviewDetail({ data }: { data: RiskReviewData }) {
	const [primaryTab, setPrimaryTab] = useState<PrimaryRiskTabId>("procurement");
	const [aiSummary, setAiSummary] = useState<string | null>(null);
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [adjudicationOpen, setAdjudicationOpen] = useState(false);
	const [procurementAdjudicationOpen, setProcurementAdjudicationOpen] = useState(false);
	const [printMode, setPrintMode] = useState<PrintMode>(null);
	// E2E: ?printMode= renders print DOM without window.print(); gated by NEXT_PUBLIC_E2E_ENABLED.
	const [urlPrintMode, setUrlPrintMode] = useState<PrintMode>(null);
	const { data: liveData } = useSWR<RiskReviewData>(
		data?.applicantId ? `/api/risk-review/reports/${data.applicantId}` : null,
		async (url: string) => {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error("Failed to refresh risk report data");
			}
			return (await response.json()) as RiskReviewData;
		},
		{
			fallbackData: data,
			revalidateOnFocus: true,
			refreshInterval: currentData => {
				if (!currentData) return 5000;
				const itcInProgress =
					currentData.sectionStatuses?.itc.machineState === "in_progress";
				const bankInProgress = currentData.bankStatementAnalysisState === "in_progress";
				return itcInProgress || bankInProgress ? 5000 : 0;
			},
		}
	);
	const resolvedData = liveData ?? data;

	useEffect(() => {
		if (printMode === null) return;

		const handleAfterPrint = () => setPrintMode(null);
		window.addEventListener("afterprint", handleAfterPrint);

		const frame = requestAnimationFrame(() => {
			window.print();
		});

		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("afterprint", handleAfterPrint);
		};
	}, [printMode]);

	useEffect(() => {
		if (process.env.NEXT_PUBLIC_E2E_ENABLED !== "true") return;
		setUrlPrintMode(parsePrintModeParam(window.location.search));
	}, []);

	const activePrintMode = printMode ?? urlPrintMode;

	if (!resolvedData?.globalData) {
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
	} = resolvedData;

	const creditComplianceState = getCreditComplianceExportState(
		resolvedData.sectionStatuses
	);
	const procurementState = getProcurementExportState(resolvedData.sectionStatuses);

	const creditComplianceHint = buildExportHint({
		label: "Credit & Compliance",
		...creditComplianceState,
	});
	const procurementHint = buildExportHint({
		label: "Procurement Checks",
		...procurementState,
	});

	const handlePrintCreditCompliance = () => {
		if (!creditComplianceState.canExport) return;
		setPrintMode("credit-compliance");
	};

	const handlePrintProcurement = () => {
		if (!procurementState.canExport) return;
		setPrintMode("procurement");
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
						canExportCreditCompliance={creditComplianceState.canExport}
						creditComplianceExportHint={creditComplianceHint}
						canExportProcurement={procurementState.canExport}
						procurementExportHint={procurementHint}
						onGenerateSummary={handleGenerateSummary}
						onPrintCreditCompliance={handlePrintCreditCompliance}
						onPrintProcurement={handlePrintProcurement}
						onAdjudicate={() => setAdjudicationOpen(true)}
						onAdjudicateProcurement={() => setProcurementAdjudicationOpen(true)}
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
								status={resolvedData.sectionStatuses?.procurement}
							/>
						)}
						{primaryTab === "itc" && (
							<ItcSection
								data={itcData}
								status={resolvedData.sectionStatuses?.itc}
								bankStatementAnalysis={bankStatementAnalysis}
								bankStatementAnalysisState={resolvedData.bankStatementAnalysisState}
								bankStatementAnalysisWarning={resolvedData.bankStatementAnalysisWarning}
							/>
						)}
						{primaryTab === "sanctions" && (
							<SanctionsSection
								data={sanctionsData}
								status={resolvedData.sectionStatuses?.sanctions}
							/>
						)}
						{primaryTab === "fica" && (
							<FicaSection
								data={ficaData}
								status={resolvedData.sectionStatuses?.fica}
								applicantId={resolvedData.applicantId}
							/>
						)}
					</div>
				</div>
			</div>

			{activePrintMode === "credit-compliance" && (
				<PrintableCreditComplianceReport aiSummary={aiSummary} data={resolvedData} />
			)}
			{activePrintMode === "procurement" && (
				<PrintableProcurementReport data={resolvedData} />
			)}

			<FinalAdjudicationDialog
				open={adjudicationOpen}
				onOpenChange={setAdjudicationOpen}
				workflowId={resolvedData.workflowId}
				applicantId={resolvedData.applicantId}
				entityName={globalData.entity.name}
			/>

			<ProcurementAdjudicationDialog
				open={procurementAdjudicationOpen}
				onOpenChange={setProcurementAdjudicationOpen}
				workflowId={resolvedData.workflowId}
				applicantId={resolvedData.applicantId}
				entityName={globalData.entity.name}
				data={resolvedData}
			/>
		</>
	);
}

export { RiskReviewDetail };
