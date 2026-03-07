import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import FormShell from "@/components/forms/form-shell";
import type { DocumentRequirement } from "@/config/document-requirements";
import {
	type DocumentRequirementContext,
	getDocumentRequirements as getConfigDocumentRequirements,
} from "@/config/document-requirements";
import { applicants } from "@/db/schema";
import type { BusinessType } from "@/lib/services/document-requirements.service";
import {
	getDocumentRequirements as getMandateDocumentRequirements,
	resolveBusinessType,
} from "@/lib/services/document-requirements.service";
import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import UploadView from "./upload-view";

interface UploadPageProps {
	params: Promise<{ token: string }>;
}

export default async function UploadPage({ params }: UploadPageProps) {
	const { token } = await params;
	const formInstance = await getFormInstanceByToken(token);

	if (!formInstance || formInstance.formType !== "DOCUMENT_UPLOADS") {
		return (
			<FormShell
				title="Upload link invalid"
				description="The upload link is invalid or no longer available.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol to request a new upload link.
				</p>
			</FormShell>
		);
	}

	if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
		return (
			<FormShell title="Upload link expired" description="This link has expired.">
				<p className="text-sm text-muted-foreground">
					Please contact StratCol to request a fresh link.
				</p>
			</FormShell>
		);
	}

	if (formInstance.status === "sent" || formInstance.status === "pending") {
		await markFormInstanceStatus(formInstance.id, "viewed");
	}

	// Look up applicant and determine document requirements
	const db = getDatabaseClient();
	let requirements: DocumentRequirement[] = getConfigDocumentRequirements({});

	if (db) {
		const [applicant] = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, formInstance.applicantId));

		if (applicant) {
			// When applicant has businessType (set by mandate workflow), use mandate document
			// requirements so we only show required docs (e.g. for proprietor: residence, ID, financials — not business address)
			const businessType = applicant.businessType as BusinessType | null | undefined;
			if (businessType) {
				const mandateReqs = getMandateDocumentRequirements(
					resolveBusinessType(applicant.entityType ?? null, businessType),
					applicant.industry ?? undefined
				);
				requirements = mandateReqs.documents
					.filter(d => d.required)
					.map(
						(d): DocumentRequirement => ({
							type: d.id as DocumentRequirement["type"],
							label: d.name,
							category: d.category as DocumentRequirement["category"],
							required: d.required,
							description: d.description,
						})
					);
			} else {
				const context: DocumentRequirementContext = {
					entityType:
						(applicant.entityType as DocumentRequirementContext["entityType"]) ??
						undefined,
					productType:
						(applicant.productType as DocumentRequirementContext["productType"]) ??
						undefined,
					industry: applicant.industry ?? undefined,
					isHighRisk: applicant.riskLevel === "red",
				};
				requirements = getConfigDocumentRequirements(context);
			}

			if (applicant.productType && applicant.productType !== "call_centre") {
				requirements.push({
					type: "ACCOUNTANT_LETTER",
					label: "Accountant letter (optional)",
					category: "FINANCIAL",
					required: false,
					description:
						"If you use an accountant, you may upload a confirmation letter on their letterhead. Not required for proprietors who manage their own accounts.",
				});
			}
		}
	}

	return (
		<FormShell
			title="Document Uploads"
			description="Upload supporting documents for StratCol onboarding.">
			<UploadView token={token} requirements={requirements} />
		</FormShell>
	);
}
