export const contractReviewContent = {
	title: "Contract Review",
	description:
		"Approve the internal contract gate and mock ABSA handoff to unblock Stage 5.",
	backLabel: "Back to Applicant",
	contractGate: {
		label: "Contract Draft Review Gate",
		description:
			"After reviewing or editing the AI-generated contract, record the review to release the contract gate.",
		placeholder: "Optional notes on review changes",
		actionLabel: "Mark Contract Draft Reviewed",
	},
	absaMockGate: {
		label: "ABSA Handoff (Mock)",
		description:
			"External ABSA submission is mocked for now. Trigger this action to mark ABSA handoff complete.",
		placeholder: "Optional note for audit trail",
		actionLabel: "Mock Send ABSA to Bank",
	},
	stageHint: "Available during stage 5 while the workflow is active.",
};
