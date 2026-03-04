import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import ExternalStatusCard from "@/components/forms/external/external-status-card";
import { applicantSubmissions, applicants } from "@/db/schema";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import { buildAgreementDefaults } from "@/lib/utils/agreement-defaults";
import AgreementForm from "./agreement-form";

interface ContractPageProps {
	params: Promise<{ token: string }>;
}

export default async function ContractPage({ params }: ContractPageProps) {
	const { token } = await params;
	const formInstance = await getFormInstanceByToken(token);

	if (!formInstance) {
		return (
			<div className="min-h-screen">
				<ExternalStatusCard
					title="Link invalid"
					description="The contract link is invalid or no longer available. Please contact StratCol to request a new link."
					variant="error"
				/>
			</div>
		);
	}

	if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
		return (
			<div className="min-h-screen">
				<ExternalStatusCard
					title="Link expired"
					description="This contract link has expired. Please contact StratCol to request a fresh link."
					variant="error"
				/>
			</div>
		);
	}

	if (formInstance.status === "submitted") {
		return (
			<div className="min-h-screen">
				<ExternalStatusCard
					title="Contract Already Submitted"
					description="This contract has already been submitted. No further action is required. Thank you."
				/>
			</div>
		);
	}

	// Mark as viewed
	if (formInstance.status === "sent" || formInstance.status === "pending") {
		await markFormInstanceStatus(formInstance.id, "viewed");
	}

	let defaultValues: ReturnType<typeof buildAgreementDefaults> = {};
	const db = await getDatabaseClient();
	if (db) {
		const [applicantRow] = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, formInstance.applicantId));
		const submissionRows = await db
			.select()
			.from(applicantSubmissions)
			.where(eq(applicantSubmissions.applicantId, formInstance.applicantId));

		if (applicantRow) {
			const facility = submissionRows.find(s => s.formType === "FACILITY_APPLICATION");
			const absa = submissionRows.find(s => s.formType === "ABSA_6995");
			defaultValues = buildAgreementDefaults({
				applicant: applicantRow,
				facilitySubmission: facility ?? null,
				absaSubmission: absa ?? null,
			});
		}
	}

	return (
		<AgreementForm
			token={token}
			applicantId={formInstance.applicantId}
			workflowId={formInstance.workflowId}
			defaultValues={defaultValues}
		/>
	);
}
