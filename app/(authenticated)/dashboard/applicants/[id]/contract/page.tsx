import ContractReviewClient from "./contract-review-client";

export default async function ApplicantContractPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <ContractReviewClient applicantId={id} />;
}
