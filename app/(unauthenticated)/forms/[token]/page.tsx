import FormShell from "@/components/forms/form-shell";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import type { FormType } from "@/lib/types";
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

	return (
		<FormShell title={content.title} description={content.description}>
			<FormView
				token={token}
				formType={formType}
				initialFormStatus={formInstance.status}
				initialDecisionStatus={formInstance.decisionStatus ?? null}
				initialDecisionOutcome={formInstance.decisionOutcome ?? null}
			/>
		</FormShell>
	);
}
