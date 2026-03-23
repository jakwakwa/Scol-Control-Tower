export const contractReviewContent = {
	title: "Contract Review",
	description:
		"Step 1: Review the contract fields. Step 2: Send the ABSA packet and confirm ABSA approval.",
	backLabel: "Back to Applicant",
	contractGate: {
		label: "Step 1 — Contract Draft Review",
		description:
			"Review or edit the contract fields, then mark as reviewed to unlock the ABSA step.",
		placeholder: "Optional notes on review changes",
		actionLabel: "Save & Mark Reviewed",
	},
	absaPacketSection: {
		label: "ABSA 6995 Packet",
		description:
			"Fill in the ABSA 6995 form for recordkeeping, then upload the prefilled PDF and send it to the test address. Once ABSA has approved, use the Confirm button below.",
		lockedHint: "Complete the contract review step above first.",
	},
	absaConfirmGate: {
		label: "Step 2 — Confirm ABSA Approved",
		description:
			"After the ABSA packet has been sent and ABSA has approved, confirm here to advance the workflow.",
		placeholder: "Optional note for audit trail",
		actionLabel: "Confirm ABSA Approved",
	},
	stageHint: "Available during Stage 5 while the workflow is active.",
};
