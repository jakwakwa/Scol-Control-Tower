import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./EmailLayout";

interface QuoteDetails {
	amount?: number;
	baseFeePercent?: number;
	adjustedFeePercent?: number | null;
	rationale?: string | null;
	riskFactors?: string | string[] | null;
	generatedAt?: string | null;
}

interface InternalAlertProps {
	title: string;
	message: string;
	workflowId: number;
	applicantId: number;
	type?: "info" | "warning" | "error" | "success";
	details?: Record<string, unknown>;
	quoteDetails?: QuoteDetails;
	actionUrl?: string;
	approveUrl?: string;
}

export const InternalAlert = ({
	title,
	message,
	workflowId,
	applicantId,
	type = "info",
	details,
	quoteDetails,
	actionUrl,
	approveUrl,
}: InternalAlertProps) => {
	const color =
		type === "error"
			? "#e11d48"
			: type === "warning"
				? "#f59e0b"
				: type === "success"
					? "#10b981"
					: "#3b82f6";

	// Default dashboard URL if not provided
	const dashboardUrl =
		actionUrl ||
		`https://stratcol-onboard-ai.vercel.app/dashboard/applicants/${applicantId}`;

	// Format risk factors for display
	const formattedRiskFactors = quoteDetails?.riskFactors
		? Array.isArray(quoteDetails.riskFactors)
			? quoteDetails.riskFactors.join(", ")
			: String(quoteDetails.riskFactors)
		: null;

	return (
		<EmailLayout preview={`Internal Alert: ${title}`}>
			<Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
				Workflow Alert
			</Heading>
			<Section
				className="rounded-lg p-4 mb-6 text-center"
				style={{ backgroundColor: `${color}20`, border: `1px solid ${color}` }}>
				<Text className="font-bold text-[18px] m-0" style={{ color: color }}>
					{title}
				</Text>
			</Section>

			<Text className="text-black text-[14px] leading-[24px]">
				<strong>Workflow ID:</strong> {workflowId}
				<br />
				<strong>Applicant ID:</strong> {applicantId}
			</Text>

			<Text className="text-black text-[14px] leading-[24px]">{message}</Text>

			{/* Structured quote summary */}
			{quoteDetails && (
				<Section className="p-4 rounded-md my-4" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
					<Text className="font-bold text-[14px] m-0 mb-2" style={{ color: "#111827" }}>
						Quote Summary
					</Text>

					<table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
						<tbody>
							{quoteDetails.baseFeePercent != null && (
								<tr>
									<td style={{ padding: "6px 0", color: "#6b7280", fontSize: "13px", width: "50%" }}>
										Base Fee (bps):
									</td>
									<td style={{ padding: "6px 0", color: "#111827", fontSize: "13px", fontWeight: 600 }}>
										{(quoteDetails.baseFeePercent / 100).toFixed(2)}%
									</td>
								</tr>
							)}
							{quoteDetails.adjustedFeePercent != null && (
								<tr>
									<td style={{ padding: "6px 0", color: "#6b7280", fontSize: "13px" }}>
										Adjusted Fee (bps):
									</td>
									<td style={{ padding: "6px 0", color: "#111827", fontSize: "13px", fontWeight: 600 }}>
										{(quoteDetails.adjustedFeePercent / 100).toFixed(2)}%
									</td>
								</tr>
							)}
						</tbody>
					</table>

					{quoteDetails.rationale && (
						<>
							<Hr style={{ borderColor: "#e5e7eb", margin: "10px 0" }} />
							<Text className="text-[12px] m-0 mb-1" style={{ color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
								Rationale
							</Text>
							<Text className="text-[13px] m-0 leading-[20px]" style={{ color: "#374151", fontStyle: "italic" }}>
								&ldquo;{quoteDetails.rationale}&rdquo;
							</Text>
						</>
					)}

					{formattedRiskFactors && (
						<>
							<Hr style={{ borderColor: "#e5e7eb", margin: "10px 0" }} />
							<Text className="text-[12px] m-0 mb-1" style={{ color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
								Risk Factors
							</Text>
							<Text className="text-[13px] m-0 leading-[20px]" style={{ color: "#374151" }}>
								{formattedRiskFactors}
							</Text>
						</>
					)}

					{quoteDetails.generatedAt && (
						<>
							<Hr style={{ borderColor: "#e5e7eb", margin: "10px 0" }} />
							<Text className="text-[12px] m-0" style={{ color: "#9ca3af" }}>
								Generated at: {new Date(quoteDetails.generatedAt).toLocaleString()}
							</Text>
						</>
					)}
				</Section>
			)}

			{/* Generic details fallback */}
			{!quoteDetails && details && Object.keys(details).length > 0 && (
				<Section className="p-4 rounded-md my-4" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
					<Text className="font-bold mb-2 text-[14px]">Details:</Text>
					{Object.entries(details).map(([key, value]) => (
						<Text key={key} className="text-[13px] m-0 leading-[22px]" style={{ color: "#374151" }}>
							<strong style={{ color: "#111827" }}>{key}:</strong>{" "}
							{String(value)}
						</Text>
					))}
				</Section>
			)}

			<Section className="text-center mt-[32px] mb-[32px]">
				{approveUrl && (
					<Button
						className="rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3 mr-3"
						style={{ backgroundColor: "#059669" }}
						href={approveUrl}>
						Approve Quote
					</Button>
				)}
				<Button
					className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
					href={dashboardUrl}>
					View in Dashboard
				</Button>
			</Section>
		</EmailLayout>
	);
};

export default InternalAlert;
