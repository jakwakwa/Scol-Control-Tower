import {
	MACHINE_STATE_CONFIG,
	REVIEW_STATE_CONFIG,
} from "@/components/dashboard/risk-review/risk-review-config";
import type { RiskReviewData } from "@/lib/risk-review/types";
import { formatVatStatus } from "@/lib/risk-review/vat-status-display";

type SectionKey = keyof NonNullable<RiskReviewData["sectionStatuses"]>;

const REPORT_SECTIONS: Array<{
	key: SectionKey;
	number: string;
	title: string;
	label: string;
}> = [
	{
		key: "procurement",
		number: "2",
		title: "Procurement & Governance",
		label: "Procurement",
	},
	{
		key: "itc",
		number: "3",
		title: "Commercial Credit Profile (ITC)",
		label: "ITC Credit",
	},
	{
		key: "sanctions",
		number: "4",
		title: "Sanctions, PEP & Adverse Media",
		label: "Sanctions & AML",
	},
	{ key: "fica", number: "5", title: "FICA / KYC Validations", label: "FICA / KYC" },
];

function isBlankValue(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === "string") {
		const normalized = value.trim();
		return normalized === "" || normalized === "—";
	}
	return false;
}

function asDisplayValue(value: unknown, fallback = "Not provided"): string {
	if (isBlankValue(value)) return fallback;
	return String(value);
}

function sectionFallback(status?: RiskReviewData["sectionStatuses"][SectionKey]): string {
	switch (status?.machineState) {
		case "completed":
			return "Not provided";
		case "failed":
			return "Unavailable";
		case "manual_required":
			return "Manual review required";
		case "in_progress":
			return "In progress";
		default:
			return "Pending";
	}
}

function metricValue(
	value: string | number | undefined,
	status?: RiskReviewData["sectionStatuses"][SectionKey],
	options?: { treatZeroAsMissingWhenNotCompleted?: boolean }
): string {
	if (
		options?.treatZeroAsMissingWhenNotCompleted &&
		value === 0 &&
		status?.machineState !== "completed"
	) {
		return sectionFallback(status);
	}

	return asDisplayValue(value, sectionFallback(status));
}

function sectionNarrative(
	status?: RiskReviewData["sectionStatuses"][SectionKey]
): string {
	switch (status?.machineState) {
		case "completed":
			return status.reviewState === "pending"
				? "Automated collection completed and is awaiting final human review."
				: "Automated collection completed and the current evidence set is export-ready.";
		case "failed":
			return "Automated collection failed for this section. The report includes only the evidence captured before failure.";
		case "manual_required":
			return "Automated collection escalated to manual review. The report includes the current evidence set and clearly marks missing items.";
		case "in_progress":
			return "Automated collection is still in progress.";
		default:
			return "Automated collection has not yet completed for this section.";
	}
}

function sectionStatusLabel(
	status?: RiskReviewData["sectionStatuses"][SectionKey]
): string {
	if (!status) return "Pending";
	return MACHINE_STATE_CONFIG[status.machineState].label;
}

function reviewStatusLabel(
	status?: RiskReviewData["sectionStatuses"][SectionKey]
): string {
	if (!status) return REVIEW_STATE_CONFIG.pending.label;
	return REVIEW_STATE_CONFIG[status.reviewState].label;
}

function availableProviders(data: RiskReviewData): string[] {
	const providers = Object.values(data.sectionStatuses ?? {})
		.map(status => status.provider)
		.filter(
			(provider): provider is string =>
				typeof provider === "string" && provider.length > 0
		);

	if (data.bankStatementAnalysis?.available === true) {
		providers.push("Gemini bank statement analysis");
	}
	if (data.ficaData.vatVerification?.checked) {
		providers.push("SARS VAT search");
	}

	return Array.from(new Set(providers));
}

function SectionHeading({
	number,
	title,
	status,
}: {
	number: string;
	title: string;
	status?: RiskReviewData["sectionStatuses"][SectionKey];
}) {
	return (
		<div className="mb-4 break-inside-avoid">
			<div className="flex items-start justify-between gap-4 border-b border-gray-300 pb-2">
				<div>
					<h2 className="text-lg font-bold uppercase">
						{number}. {title}
					</h2>
					<p className="mt-1 text-xs text-gray-600">{sectionNarrative(status)}</p>
				</div>
				<div className="text-right text-xs">
					<div className="inline-flex items-center rounded-full border border-gray-400 px-2.5 py-1 font-semibold uppercase tracking-wide">
						{sectionStatusLabel(status)}
					</div>
					<p className="mt-1 text-gray-500">Review: {reviewStatusLabel(status)}</p>
				</div>
			</div>
		</div>
	);
}

export function PrintableAuditReport({
	aiSummary,
	data,
}: {
	aiSummary: string | null;
	data: RiskReviewData;
}) {
	if (!data) return null;

	const {
		globalData,
		sectionStatuses,
		procurementData,
		itcData,
		sanctionsData,
		ficaData,
		bankStatementAnalysis,
	} = data;
	const providers = availableProviders(data);

	return (
		<div className="hidden print:block text-black bg-white font-sans p-8 max-w-4xl mx-auto text-sm">
			<div className="border-b-2 border-black pb-6 mb-6">
				<div className="flex justify-between items-end mb-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight uppercase">
							Master Compliance & Risk Audit Report
						</h1>
						<p className="text-gray-600 font-medium mt-1">CONFIDENTIAL & PRIVILEGED</p>
					</div>
					<div className="text-right">
						<p className="font-bold">Ref: {globalData.transactionId}</p>
						<p className="text-gray-600">Generated: {globalData.generatedAt}</p>
					</div>
				</div>
			</div>

			{aiSummary && (
				<div className="mb-8 border-2 border-indigo-900 bg-indigo-50 p-4 rounded-sm">
					<h2 className="text-lg font-bold uppercase border-b border-indigo-200 pb-1 mb-3 text-indigo-900">
						AI Adjudication Briefing
					</h2>
					<div className="text-sm whitespace-pre-wrap text-black leading-relaxed">
						{aiSummary}
					</div>
					<p className="text-xs text-indigo-700 italic mt-3 pt-2 border-t border-indigo-200">
						* This summary was generated from the risk review evidence available at the
						time of export.
					</p>
				</div>
			)}

			<div className="mb-8">
				<h2 className="text-lg font-bold uppercase border-b border-gray-300 pb-1 mb-3">
					1. Executive Summary
				</h2>
				<table className="w-full border-collapse border border-gray-300 mb-4">
					<tbody>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100 w-1/3">Subject Entity Name</td>
							<td className="p-2 w-2/3">
								{globalData.entity.tradingAs
									? `${globalData.entity.name} (T/A ${globalData.entity.tradingAs})`
									: globalData.entity.name}
							</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Registration Number</td>
							<td className="p-2">
								{asDisplayValue(globalData.entity.registrationNumber)} (
								{asDisplayValue(globalData.entity.entityType)})
							</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Registered Address</td>
							<td className="p-2">
								{asDisplayValue(globalData.entity.registeredAddress)}
							</td>
						</tr>
						<tr>
							<td className="p-2 font-bold bg-gray-100">Overall System Adjudication</td>
							<td className="p-2 font-bold uppercase">
								{asDisplayValue(globalData.overallStatus, "Pending")} (Risk Score:{" "}
								{globalData.overallRiskScore}/100)
							</td>
						</tr>
					</tbody>
				</table>

				<table className="w-full border-collapse border border-gray-300">
					<thead className="bg-gray-100">
						<tr>
							<th className="border border-gray-300 p-2 text-left">Section</th>
							<th className="border border-gray-300 p-2 text-left">Automation</th>
							<th className="border border-gray-300 p-2 text-left">Review</th>
							<th className="border border-gray-300 p-2 text-left">Provider</th>
						</tr>
					</thead>
					<tbody>
						{REPORT_SECTIONS.map(section => {
							const status = sectionStatuses?.[section.key];
							return (
								<tr key={section.key}>
									<td className="border border-gray-300 p-2 font-medium">
										{section.label}
									</td>
									<td className="border border-gray-300 p-2">
										{sectionStatusLabel(status)}
									</td>
									<td className="border border-gray-300 p-2">
										{reviewStatusLabel(status)}
									</td>
									<td className="border border-gray-300 p-2">
										{asDisplayValue(status?.provider, "System")}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>

				{procurementData?.categories.some(category =>
					category.checks.some(check => check.result === "FLAGGED")
				) && (
					<div className="border-l-4 border-black pl-4 py-2 my-4 bg-gray-50">
						<h3 className="font-bold uppercase text-red-700 mb-2">
							Critical Exceptions Identified
						</h3>
						{procurementData.categories
							.flatMap(category =>
								category.checks
									.filter(check => check.result === "FLAGGED")
									.map(check => ({
										category: category.id.toUpperCase(),
										message: check.name,
									}))
							)
							.map(alert => (
								<p key={`${alert.category}-${alert.message}`} className="mb-1">
									<span className="font-bold">{alert.category}:</span> {alert.message}
								</p>
							))}
					</div>
				)}
			</div>

			<div className="mb-8">
				<SectionHeading
					number="2"
					title="Procurement & Governance"
					status={sectionStatuses?.procurement}
				/>
				{procurementData ? (
					<>
						<div className="grid grid-cols-2 gap-4 mb-4">
							<div>
								<p>
									<span className="font-bold">Entity:</span> {procurementData.vendor.name}
								</p>
								<p>
									<span className="font-bold">Entity Number:</span>{" "}
									{procurementData.vendor.entityNumber}
								</p>
								<p>
									<span className="font-bold">Status:</span>{" "}
									{procurementData.vendor.entityStatus}
								</p>
							</div>
							<div>
								<p>
									<span className="font-bold">Type:</span>{" "}
									{procurementData.vendor.entityType}
								</p>
								<p>
									<span className="font-bold">Tax Number:</span>{" "}
									{asDisplayValue(procurementData.vendor.taxNumber)}
								</p>
								<p>
									<span className="font-bold">Checked At:</span>{" "}
									{asDisplayValue(procurementData.checkedAt, globalData.generatedAt)}
								</p>
							</div>
						</div>

						<h3 className="font-bold mt-4 mb-2">2.1 Category Check Summary</h3>
						<table className="w-full border-collapse border border-gray-300 text-sm">
							<thead className="bg-gray-100">
								<tr>
									<th className="border border-gray-300 p-2 text-left">Category</th>
									<th className="border border-gray-300 p-2 text-center">Total</th>
									<th className="border border-gray-300 p-2 text-center">Executed</th>
									<th className="border border-gray-300 p-2 text-center">Outstanding</th>
									<th className="border border-gray-300 p-2 text-center">Status</th>
								</tr>
							</thead>
							<tbody>
								{procurementData.summary.categories.map(category => (
									<tr key={category.category}>
										<td className="border border-gray-300 p-2">{category.category}</td>
										<td className="border border-gray-300 p-2 text-center">
											{category.total}
										</td>
										<td className="border border-gray-300 p-2 text-center">
											{category.executed}
										</td>
										<td className="border border-gray-300 p-2 text-center">
											{category.outstanding}
										</td>
										<td className="border border-gray-300 p-2 text-center font-bold">
											{category.status}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</>
				) : (
					<p className="italic text-gray-500">
						{sectionNarrative(sectionStatuses?.procurement)}
					</p>
				)}
			</div>

			<div className="mb-8">
				<SectionHeading
					number="3"
					title="Commercial Credit Profile (ITC)"
					status={sectionStatuses?.itc}
				/>
				<table className="w-full border-collapse border border-gray-300">
					<tbody>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100 w-1/3">Credit Score</td>
							<td className="p-2 w-2/3">
								{metricValue(itcData.creditScore, sectionStatuses?.itc, {
									treatZeroAsMissingWhenNotCompleted: true,
								})}{" "}
								({metricValue(itcData.scoreBand, sectionStatuses?.itc)})
							</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Civil Judgements</td>
							<td className="p-2">
								{metricValue(itcData.judgements, sectionStatuses?.itc, {
									treatZeroAsMissingWhenNotCompleted: true,
								})}
							</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Payment Defaults</td>
							<td className="p-2">
								{metricValue(itcData.defaults, sectionStatuses?.itc, {
									treatZeroAsMissingWhenNotCompleted: true,
								})}{" "}
								({metricValue(itcData.defaultDetails, sectionStatuses?.itc)})
							</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Recent Credit Enquiries</td>
							<td className="p-2">
								{metricValue(itcData.recentEnquiries, sectionStatuses?.itc)}
							</td>
						</tr>
						<tr>
							<td className="p-2 font-bold bg-gray-100">Trade References</td>
							<td className="p-2">
								{metricValue(itcData.tradeReferences, sectionStatuses?.itc)}
							</td>
						</tr>
					</tbody>
				</table>

				{bankStatementAnalysis?.available === true && (
					<>
						<h3 className="font-bold mt-4 mb-2">3.1 AI Bank Statement Analysis</h3>
						<table className="w-full border-collapse border border-gray-300">
							<tbody>
								<tr className="border-b border-gray-300">
									<td className="p-2 font-bold bg-gray-100 w-1/3">Bank</td>
									<td className="p-2">
										{asDisplayValue(bankStatementAnalysis.bankAnalysis.bankName)}
									</td>
								</tr>
								<tr className="border-b border-gray-300">
									<td className="p-2 font-bold bg-gray-100">Account Type</td>
									<td className="p-2">
										{asDisplayValue(bankStatementAnalysis.bankAnalysis.accountType)}
									</td>
								</tr>
								<tr className="border-b border-gray-300">
									<td className="p-2 font-bold bg-gray-100">Volatility Score</td>
									<td className="p-2">
										{bankStatementAnalysis.bankAnalysis.volatilityScore}/100
									</td>
								</tr>
								<tr className="border-b border-gray-300">
									<td className="p-2 font-bold bg-gray-100">Net Cash Flow</td>
									<td className="p-2">{bankStatementAnalysis.cashFlow.netCashFlow}</td>
								</tr>
								<tr className="border-b border-gray-300">
									<td className="p-2 font-bold bg-gray-100">Risk Category</td>
									<td className="p-2">
										{bankStatementAnalysis.creditRisk.riskCategory.replace("_", " ")}
									</td>
								</tr>
								<tr>
									<td className="p-2 font-bold bg-gray-100">Overall AI Score</td>
									<td className="p-2">{bankStatementAnalysis.overall.score}/100</td>
								</tr>
							</tbody>
						</table>

						{bankStatementAnalysis.creditRisk.redFlags.length > 0 && (
							<div className="mt-3">
								<p className="font-bold mb-1">Red Flags</p>
								<ul className="list-disc pl-5 space-y-1">
									{bankStatementAnalysis.creditRisk.redFlags.map(flag => (
										<li key={flag}>{flag}</li>
									))}
								</ul>
							</div>
						)}
					</>
				)}
			</div>

			<div className="mb-8">
				<SectionHeading
					number="4"
					title="Sanctions, PEP & Adverse Media"
					status={sectionStatuses?.sanctions}
				/>
				<p className="mb-2">
					<span className="font-bold">Global Sanctions Match:</span>{" "}
					{metricValue(sanctionsData.sanctionsMatch, sectionStatuses?.sanctions)}
				</p>
				<p className="mb-2">
					<span className="font-bold">Politically Exposed Persons (PEP) Hits:</span>{" "}
					{metricValue(sanctionsData.pepHits, sectionStatuses?.sanctions, {
						treatZeroAsMissingWhenNotCompleted: true,
					})}
				</p>
				<p className="mb-2">
					<span className="font-bold">Adverse Media Hits:</span>{" "}
					{metricValue(sanctionsData.adverseMedia, sectionStatuses?.sanctions, {
						treatZeroAsMissingWhenNotCompleted: true,
					})}
				</p>

				{sanctionsData.alerts.length > 0 && (
					<div className="mt-4">
						<h3 className="font-bold mb-2">4.1 Adverse Media & Alerts Log</h3>
						<table className="w-full border-collapse border border-gray-300">
							<thead className="bg-gray-100">
								<tr>
									<th className="border border-gray-300 p-2 text-left">Date</th>
									<th className="border border-gray-300 p-2 text-left">Source</th>
									<th className="border border-gray-300 p-2 text-left">Detail</th>
									<th className="border border-gray-300 p-2 text-center">Severity</th>
								</tr>
							</thead>
							<tbody>
								{sanctionsData.alerts.map(alert => (
									<tr key={`${alert.date}-${alert.source}-${alert.title}`}>
										<td className="border border-gray-300 p-2 whitespace-nowrap">
											{alert.date}
										</td>
										<td className="border border-gray-300 p-2">{alert.source}</td>
										<td className="border border-gray-300 p-2">{alert.title}</td>
										<td className="border border-gray-300 p-2 text-center font-bold">
											{alert.severity}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				{sanctionsData.alerts.length === 0 && (
					<p className="text-gray-500 italic mt-3">
						{sectionStatuses?.sanctions?.machineState === "completed"
							? "No detailed sanctions or adverse-media alerts were captured in the current report payload."
							: sectionNarrative(sectionStatuses?.sanctions)}
					</p>
				)}
			</div>

			<div className="mb-8">
				<SectionHeading
					number="5"
					title="FICA / KYC Validations"
					status={sectionStatuses?.fica}
				/>
				<div className="grid grid-cols-2 gap-6">
					<div>
						<h3 className="font-bold mb-2 border-b border-gray-200 pb-4">
							5.1 Natural Person Verification
						</h3>
						{ficaData.identity.length > 0 ? (
							ficaData.identity.map(identity => (
								<div key={`${identity.name}-${identity.id}`} className="mb-2">
									<p className="font-bold">
										{identity.name} ({identity.id})
									</p>
									<p className="text-xs">
										HANIS Status: {identity.status} | Life Status:{" "}
										{identity.deceasedStatus}
									</p>
								</div>
							))
						) : (
							<p className="italic text-gray-500">
								{sectionNarrative(sectionStatuses?.fica)}
							</p>
						)}
					</div>
					<div>
						<h3 className="font-bold mb-2 border-b border-gray-200 pb-1">
							5.2 Proof of Residence
						</h3>
						<p className="text-sm font-bold">
							{metricValue(ficaData.residence.address, sectionStatuses?.fica)}
						</p>
						<p className="text-xs mt-1">
							Source:{" "}
							{metricValue(ficaData.residence.documentType, sectionStatuses?.fica)}
						</p>
						<p className="text-xs">
							Document Age:{" "}
							{metricValue(ficaData.residence.ageInDays, sectionStatuses?.fica)} Days (
							{metricValue(ficaData.residence.status, sectionStatuses?.fica)})
						</p>
					</div>
				</div>

				<div className="mt-4">
					<h3 className="font-bold mb-2 border-b border-gray-200 pb-1">
						5.3 Banking Verification (AVS)
					</h3>
					<table className="w-full border-collapse border border-gray-300">
						<tbody>
							<tr className="border-b border-gray-300">
								<td className="p-2 font-bold bg-gray-100 w-1/3">Bank</td>
								<td className="p-2">
									{metricValue(ficaData.banking.bankName, sectionStatuses?.fica)}
								</td>
							</tr>
							<tr className="border-b border-gray-300">
								<td className="p-2 font-bold bg-gray-100">Account Number</td>
								<td className="p-2">
									{metricValue(ficaData.banking.accountNumber, sectionStatuses?.fica)}
								</td>
							</tr>
							<tr className="border-b border-gray-300">
								<td className="p-2 font-bold bg-gray-100">AVS Status</td>
								<td className="p-2">
									{metricValue(ficaData.banking.avsStatus, sectionStatuses?.fica)}
								</td>
							</tr>
							<tr>
								<td className="p-2 font-bold bg-gray-100">AVS Detail</td>
								<td className="p-2">
									{metricValue(ficaData.banking.avsDetails, sectionStatuses?.fica)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div className="mt-4">
					<h3 className="font-bold mb-2 border-b border-gray-200 pb-1">
						5.4 VAT Verification
					</h3>
					<p className="text-sm">
						<span className="font-bold">Status:</span>{" "}
						{formatVatStatus(ficaData.vatVerification?.status ?? "not_checked")}
					</p>
					<p className="text-sm">
						<span className="font-bold">VAT Number:</span>{" "}
						{metricValue(ficaData.vatVerification?.vatNumber, sectionStatuses?.fica)}
					</p>
					{ficaData.vatVerification?.tradingName ? (
						<p className="text-sm">
							<span className="font-bold">Trading Name:</span>{" "}
							{ficaData.vatVerification.tradingName}
						</p>
					) : null}
					{ficaData.vatVerification?.office ? (
						<p className="text-sm">
							<span className="font-bold">Office:</span> {ficaData.vatVerification.office}
						</p>
					) : null}
					{ficaData.vatVerification?.message ? (
						<p className="text-xs mt-1">{ficaData.vatVerification.message}</p>
					) : null}
				</div>

				{Array.isArray(ficaData.documentAiResult) &&
					ficaData.documentAiResult.length > 0 && (
						<div className="mt-4">
							<h3 className="font-bold mb-2 border-b border-gray-200 pb-1">
								5.5 Document AI Identity Proofing
							</h3>
							<table className="w-full border-collapse border border-gray-300">
								<thead className="bg-gray-100">
									<tr>
										<th className="border border-gray-300 p-2 text-left">Signal</th>
										<th className="border border-gray-300 p-2 text-left">Result</th>
									</tr>
								</thead>
								<tbody>
									{ficaData.documentAiResult.map(result => (
										<tr key={`${result.type}-${result.value}`}>
											<td className="border border-gray-300 p-2">{result.type}</td>
											<td className="border border-gray-300 p-2">{result.value}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
			</div>

			<div className="mt-12 pt-4 border-t-2 border-black text-center text-xs text-gray-500">
				<p>
					This report was generated by StratCol Control Tower from the evidence available
					at export time.
				</p>
				<p>
					Sections marked Pending, Failed, or Manual Review Required indicate incomplete
					or degraded evidence collection and should be reviewed by an operator before
					reliance.
				</p>
				{providers.length > 0 && (
					<p>Providers referenced in this report: {providers.join(", ")}.</p>
				)}
				<p className="mt-2 font-bold uppercase">End of Report</p>
			</div>
		</div>
	);
}
