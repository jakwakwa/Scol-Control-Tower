export const contractReviewContent = {
	title: "Contract Review",
	description:
		"Approve the internal contract gate, complete the ABSA packet step, then confirm ABSA approval to unblock Stage 5.",
	backLabel: "Back to Applicant",
	contractGate: {
		label: "Contract Draft Review Gate",
		description:
			"After reviewing or editing the AI-generated contract, record the review to release the contract gate.",
		placeholder: "Optional notes on review changes",
		actionLabel: "Mark Contract Draft Reviewed",
	},
	absaPacketSection: {
		label: "ABSA 6995 Packet",
		description:
			"Fill in the ABSA 6995 form for recordkeeping, then upload the prefilled PDF and send it to the test address. Once ABSA has approved, use the Confirm button below.",
		lockedHint: "Complete the contract review gate above first.",
	},
	absaConfirmGate: {
		label: "Confirm ABSA Approved",
		description:
			"After the ABSA packet has been sent and ABSA has approved the contract, click here to confirm and advance the workflow.",
		placeholder: "Optional note for audit trail",
		actionLabel: "Confirm ABSA Approved",
	},
	stageHint: "Available during stage 5 while the workflow is active.",
};
