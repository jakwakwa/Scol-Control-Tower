import { sendApplicantFormLinksEmail } from "@/lib/services/email.service";
import { createFormInstance } from "@/lib/services/form.service";
import type { FormType } from "@/lib/types";

export interface FormLink {
	formType: FormType;
	url: string;
}

export interface FormLinkBundle {
	links: FormLink[];
}

export async function generateFormLinks(options: {
	applicantId: number;
	workflowId: number;
}) {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

	const formTypes: FormType[] = [
		"FACILITY_APPLICATION",
		"SIGNED_QUOTATION",
		"AGREEMENT_CONTRACT",
		"DOCUMENT_UPLOADS",
	];

	const links: FormLink[] = [];

	for (const formType of formTypes) {
		const { token } = await createFormInstance({
			applicantId: options.applicantId,
			workflowId: options.workflowId,
			formType,
		});

		const url =
			formType === "DOCUMENT_UPLOADS"
				? `${baseUrl}/uploads/${token}`
				: `${baseUrl}/forms/${token}`;

		links.push({ formType, url });
	}

	return { links };
}

export async function sendFormLinksEmail(options: {
	email: string;
	contactName?: string;
	links: FormLink[];
}) {
	// Adapter to match the format expected by the email service if needed,
	// though here the types are compatible enough for a direct call or simple map.
	// The FormLink type in email.service accepts {formType: string, url: string}
	// Our local FormLink has formType as enum.

	return await sendApplicantFormLinksEmail({
		email: options.email,
		contactName: options.contactName,
		links: options.links.map(l => ({
			formType: l.formType,
			url: l.url,
		})),
	});
}
