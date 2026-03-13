import { render } from "@react-email/render";
import { Resend } from "resend";
import ApplicantFormLinks, {
	type FormLink,
	type RequiredDocumentSummary,
} from "@/components/emails/ApplicantFormLinks";
import InternalAlert from "@/components/emails/InternalAlert";
import type { ScreeningValueType } from "@/db/schema";

const resendApiKey = process.env.RESEND_API_KEY;
// Use the configured alert recipients or fall back to a default/empty
// Optional chaining on split; nullish coalesce before map so undefined never throws
const alertRecipients = (
	process.env.ALERT_EMAIL_RECIPIENTS?.split(",") ?? []
).map((e) => e.trim()).filter(Boolean);
const dataEntrantRecipients = (
	process.env.DATA_ENTRANT_EMAIL_RECIPIENTS?.split(",") ?? []
).map((e) => e.trim()).filter(Boolean);
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

// Initialize Resend client if API key is present
if (!resendApiKey) {
	console.warn("[EmailService] RESEND_API_KEY is missing from environment.");
}
const resend = resendApiKey ? new Resend(resendApiKey) : null;

type EmailResult =
	| { success: true; messageId: string }
	| { success: false; error: string };

/**
 * Send an internal alert email to staff
 */
export async function sendInternalAlertEmail(params: {
	title: string;
	message: string;
	workflowId: number;
	applicantId: number;
	type?: "info" | "warning" | "error" | "success";
	details?: Record<string, unknown>;
	quoteDetails?: {
		amount?: number;
		baseFeePercent?: number;
		adjustedFeePercent?: number | null;
		rationale?: string | null;
		riskFactors?: string | string[] | null;
		generatedAt?: string | null;
	};
	actionUrl?: string;
	approveUrl?: string;
}): Promise<EmailResult> {
	if (!resend || alertRecipients.length === 0) {
		console.warn(
			"[EmailService] Resend not configured or no alert recipients. Email not sent."
		);
		return { success: false, error: "Resend not configured or no recipients" };
	}

	try {
		const emailHtml = await render(
			<InternalAlert
				title={params.title}
				message={params.message}
				workflowId={params.workflowId}
				applicantId={params.applicantId}
				type={params.type}
				details={params.details}
				quoteDetails={params.quoteDetails}
				actionUrl={params.actionUrl}
				approveUrl={params.approveUrl}
			/>
		);

		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: alertRecipients,
			subject: `[${params.type?.toUpperCase() || "INFO"}] ${params.title}`,
			html: emailHtml,
		});

		if (error) {
			console.error("[EmailService] Failed to send alert:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending alert:", error);
		return { success: false, error: String(error) };
	}
}

/**
 * Send onboarding form links to an applicant
 */
export async function sendApplicantFormLinksEmail(params: {
	email: string;
	contactName?: string;
	links: FormLink[];
	requiredDocuments?: RequiredDocumentSummary[];
}): Promise<EmailResult> {
	if (!resend) {
		console.warn("[EmailService] Resend not configured. Link email not sent.");
		return { success: false, error: "Resend not configured" };
	}

	try {
		const emailHtml = await render(
			<ApplicantFormLinks
				contactName={params.contactName}
				links={params.links}
				requiredDocuments={params.requiredDocuments}
			/>
		);

		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: params.email,
			subject: "Action Required: Complete your StratCol Onboarding",
			html: emailHtml,
		});

		if (error) {
			console.error("[EmailService] Failed to send applicant email:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending applicant email:", error);
		return { success: false, error: String(error) };
	}
}

/**
 * Send re-applicant denied alert — Scenario 2b
 * Notifies Risk Manager and data entrant when a previously declined applicant
 * re-applies and is automatically denied.
 */
export async function sendReApplicantDeniedEmail(params: {
	workflowId: number;
	applicantId: number;
	companyName: string;
	matchedOn: ScreeningValueType;
	matchedValue: string;
}): Promise<EmailResult> {
	if (!resend) {
		console.warn("[EmailService] Resend not configured. Re-applicant email not sent.");
		return { success: false, error: "Resend not configured" };
	}

	const recipients = [...new Set([...alertRecipients, ...dataEntrantRecipients])];
	if (recipients.length === 0) {
		console.warn("[EmailService] No recipients for re-applicant alert. Email not sent.");
		return { success: false, error: "No recipients configured" };
	}

	const matchLabel =
		params.matchedOn === "id_number"
			? "ID number"
			: params.matchedOn === "board_member_id"
				? "board member ID"
				: params.matchedOn === "cellphone"
					? "cellphone"
					: params.matchedOn === "board_member_name"
						? "board member name"
						: "bank account";

	const message = `A re-applicant was detected and the workflow has been automatically terminated.

Company: ${params.companyName}
Applicant ID: ${params.applicantId}
Workflow ID: ${params.workflowId}

Matched on: ${matchLabel}
Matched value: ${params.matchedValue}

The applicant was previously declined and has reapplied. They can contact Stratcol or support to resolve the issue.`;

	try {
		const emailHtml = await render(
			<InternalAlert
				title="Re-Applicant Denied — Workflow Terminated"
				message={message}
				workflowId={params.workflowId}
				applicantId={params.applicantId}
				type="warning"
				actionUrl={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/workflows/${params.workflowId}`}
			/>
		);

		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: recipients,
			subject: "[WARNING] Re-Applicant Denied — Workflow Terminated",
			html: emailHtml,
		});

		if (error) {
			console.error("[EmailService] Failed to send re-applicant alert:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending re-applicant email:", error);
		return { success: false, error: String(error) };
	}
}

/**
 * Send ABSA 6995 packet (mock) to ABSA_TEST_EMAIL.
 * Used for internal handoff: staff uploads prefilled PDF, system sends to test address.
 */
export async function sendAbsaPacketEmail(params: {
	workflowId: number;
	applicantId: number;
	companyName: string;
	fileName: string;
	fileContentBase64: string;
	mimeType?: string;
}): Promise<EmailResult> {
	const toEmail = process.env.ABSA_TEST_EMAIL?.trim();
	if (!toEmail) {
		console.warn("[EmailService] ABSA_TEST_EMAIL not configured. ABSA packet not sent.");
		return { success: false, error: "ABSA_TEST_EMAIL not configured" };
	}
	if (!resend) {
		console.warn("[EmailService] Resend not configured. ABSA packet not sent.");
		return { success: false, error: "Resend not configured" };
	}

	try {
		const buffer = Buffer.from(params.fileContentBase64, "base64");
		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: toEmail,
			subject: `[ABSA 6995] ${params.companyName} — Workflow ${params.workflowId}`,
			html: `
				<p>Internal ABSA 6995 packet submission for workflow ${params.workflowId}, applicant ${params.applicantId}.</p>
				<p>Company: ${params.companyName}</p>
				<p>This is a mock send — packet is attached for your records.</p>
			`,
			attachments: [
				{
					filename: params.fileName || "absa-6995.pdf",
					content: buffer,
				},
			],
		});

		if (error) {
			console.error("[EmailService] Failed to send ABSA packet:", error);
			return { success: false, error: error.message };
		}
		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending ABSA packet:", error);
		return { success: false, error: String(error) };
	}
}

export async function sendApplicantStatusEmail(params: {
	email: string;
	subject: string;
	heading: string;
	message: string;
}): Promise<EmailResult> {
	if (!resend) {
		console.warn("[EmailService] Resend not configured. Status email not sent.");
		return { success: false, error: "Resend not configured" };
	}

	try {
		const html = `
			<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
				<h2 style="margin: 0 0 12px;">${params.heading}</h2>
				<p style="margin: 0;">${params.message}</p>
			</div>
		`;

		const { data, error } = await resend.emails.send({
			from: fromEmail,
			to: params.email,
			subject: params.subject,
			html,
		});

		if (error) {
			console.error("[EmailService] Failed to send applicant status email:", error);
			return { success: false, error: error.message };
		}

		return { success: true, messageId: data?.id || "unknown" };
	} catch (error) {
		console.error("[EmailService] Exception sending applicant status email:", error);
		return { success: false, error: String(error) };
	}
}
