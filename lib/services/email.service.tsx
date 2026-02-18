import { render } from "@react-email/render";
import { Resend } from "resend";
import ApplicantFormLinks, {
	type FormLink,
	type RequiredDocumentSummary,
} from "@/components/emails/ApplicantFormLinks";
import InternalAlert from "@/components/emails/InternalAlert";

const resendApiKey = process.env.RESEND_API_KEY;
// Use the configured alert recipients or fall back to a default/empty
const alertRecipients = process.env.ALERT_EMAIL_RECIPIENTS?.split(",") || [];
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
	actionUrl?: string;
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
				actionUrl={params.actionUrl}
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
