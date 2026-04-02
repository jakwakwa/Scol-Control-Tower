import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { sendApplicantStatusEmail } from "@/lib/services/email.service";
import { createWorkflowNotification } from "@/lib/services/notification-events.service";
import { eq } from "drizzle-orm";


/**
 * 
 * Notification Handler
 * ------------------
 * This inngest handler function is used to send an email (using resend and react-email sdk) to the applicant of the outcome of their application.      
 * @example
 * ```typescript
 * import { notifyApplicantDecline } from "@/inngest/functions/handlers/notifications-handler";
 * 
 * await notifyApplicantDecline(options: {
 *  applicantId: 1,
 *  workflowId: 1,
 *  subject: "Application Declined",
 *  heading: "Application to StratCol has been declined",
 *  message: "We regret to inform you that your application to StratCol has been declined. ",
 * });
 * ```
 * 
 * @export
 * @param {{
 * 	applicantId: number;
 * 	workflowId: number;
 * 	subject: string;
 * 	heading: string;
 * 	message: string;
 * }} options
 * @return {*}  {Promise<void>}
 * @see https://stratcolltd.mintlify.app/user-guides/workflows#email-notifications-on-decline
 * 
 * @author [jakwakwa](https://github.com/jakwakwa)
 * @see [User Guide](https://stratcolltd.mintlify.app/user-guides/workflows#email-notifications-on-decline)
 *                   
 */

export async function notifyApplicantDecline(options: {
	applicantId: number;
	workflowId: number;
	subject: string;
	heading: string;
	message: string;
}): Promise<void> {
	const db = getDatabaseClient();
	if (!db) return;
	const [applicant] = await db
		.select()
		.from(applicants)
		.where(eq(applicants.id, options.applicantId));
	if (!applicant) return;

	await sendApplicantStatusEmail({
		email: applicant.email,
		subject: options.subject,
		heading: options.heading,
		message: options.message,
	});

	await createWorkflowNotification({
		workflowId: options.workflowId,
		applicantId: options.applicantId,
		type: "error",
		title: options.heading,
		message: options.message,
		actionable: false,
	});
}


