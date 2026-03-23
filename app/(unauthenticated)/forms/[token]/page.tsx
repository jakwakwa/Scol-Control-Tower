import { and, desc, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import FormShell from "@/components/forms/form-shell";
import {
	applicantSubmissions,
	applicants,
	internalForms,
	internalSubmissions,
	workflows,
} from "@/db/schema";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import type { FormType } from "@/lib/types";
import {
	buildAgreementDefaults,
	type AgreementContractOverrides,
} from "@/lib/utils/agreement-defaults";
import { formContent } from "./content";
import FormView from "./form-view";

interface FormPageProps {
	params: Promise<{ token: string }>;
}

export default async function FormPage({ params }: FormPageProps) {
	const { token } = await params;
	const formInstance = await getFormInstanceByToken(token);

	if (!formInstance) {
		return (
			<FormShell
				title="Form link invalid"
				description="The form link is invalid or no longer available.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol to request a new form link.
				</p>
			</FormShell>
		);
	}

	if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
		return (
			<FormShell title="Form link expired" description="This link has expired.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol to request a fresh link.
				</p>
			</FormShell>
		);
	}

	if (formInstance.formType === "DOCUMENT_UPLOADS") {
		return (
			<FormShell
				title="Wrong link type"
				description="This link is intended for document uploads.">
				<p className="text-sm text-muted-foreground">
					Please use the document upload link supplied in your email.
				</p>
			</FormShell>
		);
	}

	if (formInstance.status === "sent" || formInstance.status === "pending") {
		await markFormInstanceStatus(formInstance.id, "viewed");
	}

	const formType = formInstance.formType as Exclude<FormType, "DOCUMENT_UPLOADS">;
	const content = formContent[formType];
	let initialAgreementDefaults: ReturnType<typeof buildAgreementDefaults> | undefined;

	if (!content) {
		return (
			<FormShell
				title="Unsupported form"
				description="This form type is not yet available.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol for assistance.
				</p>
			</FormShell>
		);
	}

	if (formType === "AGREEMENT_CONTRACT") {
		const db = await getDatabaseClient();
		if (db) {
			let contractOverrides: AgreementContractOverrides | null = null;
			const [applicantRow] = await db
				.select()
				.from(applicants)
				.where(eq(applicants.id, formInstance.applicantId));
			const submissionRows = await db
				.select()
				.from(applicantSubmissions)
				.where(eq(applicantSubmissions.applicantId, formInstance.applicantId));

			if (formInstance.workflowId) {
				const [workflowRow] = await db
					.select({ metadata: workflows.metadata })
					.from(workflows)
					.where(eq(workflows.id, formInstance.workflowId))
					.limit(1);
				if (workflowRow?.metadata) {
					try {
						const metadata = JSON.parse(workflowRow.metadata) as {
							contractOverrides?: AgreementContractOverrides;
						};
						contractOverrides = metadata.contractOverrides ?? null;
					} catch {
						contractOverrides = null;
					}
				}
			}

			let absaSubmission: { formType: string; data?: string | null } | null =
				submissionRows.find(s => s.formType === "ABSA_6995") ?? null;

			if (!absaSubmission && formInstance.workflowId) {
				const [absaForm] = await db
					.select()
					.from(internalForms)
					.where(
						and(
							eq(internalForms.workflowId, formInstance.workflowId),
							eq(internalForms.formType, "absa_6995")
						)
					)
					.limit(1);
				if (absaForm) {
					const [latest] = await db
						.select({ formData: internalSubmissions.formData })
						.from(internalSubmissions)
						.where(eq(internalSubmissions.internalFormId, absaForm.id))
						.orderBy(desc(internalSubmissions.createdAt))
						.limit(1);
					if (latest?.formData) {
						absaSubmission = { formType: "absa_6995", data: latest.formData };
					}
				}
			}

			if (applicantRow) {
				const facility = submissionRows.find(
					submission => submission.formType === "FACILITY_APPLICATION"
				);
				initialAgreementDefaults = buildAgreementDefaults({
					applicant: applicantRow,
					facilitySubmission: facility ?? null,
					absaSubmission,
					contractOverrides,
				});
			}
		}
	}

	return (
		<FormShell title={content.title} description={content.description}>
			<FormView
				token={token}
				formType={formType}
				initialFormStatus={formInstance.status}
				initialDecisionStatus={formInstance.decisionStatus ?? null}
				initialDecisionOutcome={formInstance.decisionOutcome ?? null}
				initialAgreementDefaults={initialAgreementDefaults}
			/>
		</FormShell>
	);
}
