import {
	MACHINE_STATE_CONFIG,
	REVIEW_STATE_CONFIG,
} from "@/components/dashboard/risk-review/risk-review-config";
import type { RiskReviewData } from "@/lib/risk-review/types";

type ProcurementStatus = NonNullable<
	RiskReviewData["sectionStatuses"]
>[keyof NonNullable<RiskReviewData["sectionStatuses"]>];

function asDisplayValue(value: unknown, fallback = "Not provided"): string {
	if (value == null) return fallback;
	if (typeof value === "string") {
		const normalized = value.trim();
		if (normalized === "" || normalized === "—") return fallback;
		return normalized;
	}
	return String(value);
}

function sectionStatusLabel(status?: ProcurementStatus): string {
	if (!status) return "Pending";
	return MACHINE_STATE_CONFIG[status.machineState].label;
}

function reviewStatusLabel(status?: ProcurementStatus): string {
	if (!status) return REVIEW_STATE_CONFIG.pending.label;
	return REVIEW_STATE_CONFIG[status.reviewState].label;
}

function sectionNarrative(status?: ProcurementStatus): string {
	switch (status?.machineState) {
		case "completed":
			return status.reviewState === "pending"
				? "Automated procurement checks completed and awaiting Risk Manager adjudication."
				: "Automated procurement checks completed and the current evidence set is export-ready.";
		case "failed":
			return "Automated procurement checks failed. The report includes only the evidence captured before failure.";
		case "manual_required":
			return "Automated procurement checks escalated to manual review. The report includes the current evidence set and clearly marks missing items.";
		case "in_progress":
			return "Automated procurement checks are still in progress.";
		default:
			return "Automated procurement checks have not yet completed.";
	}
}

export function PrintableProcurementReport({ data }: { data: RiskReviewData }) {
	const { globalData, sectionStatuses, procurementData } = data;
	const procStatus = sectionStatuses?.procurement;
	const provider = procStatus?.provider ?? "procurecheck";

	const flaggedChecks = procurementData
		? procurementData.categories.flatMap(category =>
				category.checks
					.filter(check => check.result === "FLAGGED")
					.map(check => ({
						category: category.id.toUpperCase(),
						name: check.name,
					}))
			)
		: [];

	return (
		<div className="hidden print:block text-black print:bg-white font-sans p-8 max-w-4xl mx-auto text-sm">
			<div className="border-b-2 border-black pb-6 mb-6">
				<div className="flex justify-between items-end mb-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight uppercase">
							Procurement Checks Report
						</h1>
						<p className="text-gray-600 font-medium mt-1">CONFIDENTIAL & PRIVILEGED</p>
						<p className="text-gray-600 font-medium mt-1 text-xs italic">
							This report covers ProcureCheck vendor governance evidence only. ITC,
							sanctions, and FICA findings are published separately in the Credit &
							Compliance Risk Report.
						</p>
					</div>
					<div className="text-right">
						<p className="font-bold">Ref: {globalData.transactionId}</p>
						<p className="text-gray-600">Generated: {globalData.generatedAt}</p>
					</div>
				</div>
			</div>

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
							<td className="p-2 font-bold bg-gray-100">Procurement Automation</td>
							<td className="p-2 font-bold uppercase">
								{sectionStatusLabel(procStatus)} / Review: {reviewStatusLabel(procStatus)}
							</td>
						</tr>
					</tbody>
				</table>

				{flaggedChecks.length > 0 && (
					<div className="border-l-4 border-black pl-4 py-2 my-4 bg-gray-50">
						<h3 className="font-bold uppercase text-red-700 mb-2">
							Critical Exceptions Identified
						</h3>
						{flaggedChecks.map(alert => (
							<p key={`${alert.category}-${alert.name}`} className="mb-1">
								<span className="font-bold">{alert.category}:</span> {alert.name}
							</p>
						))}
					</div>
				)}
			</div>

			<div className="mb-8">
				<div className="mb-4 break-inside-avoid">
					<div className="flex items-start justify-between gap-4 border-b border-gray-300 pb-2">
						<div>
							<h2 className="text-lg font-bold uppercase">2. Procurement & Governance</h2>
							<p className="mt-1 px-0 text-xs text-gray-600">
								{sectionNarrative(procStatus)}
							</p>
						</div>
						<div className="text-right text-xs px-0 min-w-[150px]">
							<div className="inline-flex items-end rounded-full border border-gray-400 bg-neutral-300/50 px-[5px] py-px font-bold h-fit text-center text-[9px] tracking-tight">
								{sectionStatusLabel(procStatus)}
							</div>
							<p className="mt-0 text-gray-500">
								Review: {reviewStatusLabel(procStatus)}
							</p>
						</div>
					</div>
				</div>

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

						<h3 className="font-bold mt-4 mb-2">2.2 Detailed Checks by Category</h3>
						{procurementData.categories.map(category => (
							<div
								key={category.id}
								className="mb-4 break-inside-avoid border border-gray-200 p-3">
								<p className="font-bold uppercase text-xs mb-1">
									{category.id} — {category.description}
								</p>
								<table className="w-full border-collapse border border-gray-300 text-xs">
									<thead className="bg-gray-100">
										<tr>
											<th className="border border-gray-300 p-2 text-left">Check</th>
											<th className="border border-gray-300 p-2 text-center">Status</th>
											<th className="border border-gray-300 p-2 text-center">Result</th>
										</tr>
									</thead>
									<tbody>
										{category.checks.map(check => (
											<tr key={`${category.id}-${check.name}`}>
												<td className="border border-gray-300 p-2">{check.name}</td>
												<td className="border border-gray-300 p-2 text-center">
													{check.status}
												</td>
												<td className="border border-gray-300 p-2 text-center font-bold">
													{check.result}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						))}
					</>
				) : (
					<p className="italic text-gray-500">{sectionNarrative(procStatus)}</p>
				)}
			</div>

			<div className="mt-12 pt-4 border-t-2 border-black text-center text-xs text-gray-500">
				<p>
					This report was generated by StratCol Control Tower from the ProcureCheck
					evidence available at export time.
				</p>
				<p>
					Sections marked Pending, Failed, or Manual Review Required indicate incomplete
					or degraded evidence collection and should be reviewed by an operator before
					reliance.
				</p>
				<p className="font-semibold italic mt-1">
					ITC credit, sanctions, and FICA findings are intentionally excluded from this
					report. Refer to the Credit & Compliance Risk Report for those findings.
				</p>
				<p className="mt-1">Provider: {provider}.</p>
				<p className="mt-2 font-bold uppercase">End of Report</p>
			</div>
		</div>
	);
}