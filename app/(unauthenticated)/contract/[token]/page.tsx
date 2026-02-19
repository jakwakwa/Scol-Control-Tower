import {
	getFormInstanceByToken,
	markFormInstanceStatus,
} from "@/lib/services/form.service";
import ContractForm from "./contract-form";

interface ContractPageProps {
	params: Promise<{ token: string }>;
}

export default async function ContractPage({ params }: ContractPageProps) {
	const { token } = await params;
	const formInstance = await getFormInstanceByToken(token);

	if (!formInstance) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="mx-auto max-w-md space-y-4 rounded-xl bg-white p-10 text-center shadow-lg">
					<h1 className="text-xl font-semibold text-[#355c7d]">Link invalid</h1>
					<p className="text-sm text-gray-500">
						The contract link is invalid or no longer available. Please contact StratCol
						to request a new link.
					</p>
				</div>
			</div>
		);
	}

	if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="mx-auto max-w-md space-y-4 rounded-xl bg-white p-10 text-center shadow-lg">
					<h1 className="text-xl font-semibold text-[#355c7d]">Link expired</h1>
					<p className="text-sm text-gray-500">
						This contract link has expired. Please contact StratCol to request a fresh
						link.
					</p>
				</div>
			</div>
		);
	}

	if (formInstance.status === "submitted") {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="mx-auto max-w-md space-y-4 rounded-xl bg-white p-10 text-center shadow-lg">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
						<svg
							className="h-8 w-8 text-green-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
					<h1 className="text-xl font-semibold text-[#355c7d]">
						Contract Already Submitted
					</h1>
					<p className="text-sm text-gray-500">
						This contract has already been submitted. No further action is required. Thank
						you.
					</p>
				</div>
			</div>
		);
	}

	// Mark as viewed
	if (formInstance.status === "sent" || formInstance.status === "pending") {
		await markFormInstanceStatus(formInstance.id, "viewed");
	}

	return (
		<ContractForm
			token={token}
			applicantId={formInstance.applicantId}
			workflowId={formInstance.workflowId}
		/>
	);
}
