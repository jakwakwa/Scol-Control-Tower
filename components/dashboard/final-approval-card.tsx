"use client";

import {
	RiCheckboxBlankCircleLine,
	RiCheckboxCircleLine,
	RiCheckLine,
	RiContractLine,
	RiFileTextLine,
	RiLoader4Line,
	RiShieldCheckLine,
	RiUserLine,
} from "@remixicon/react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface ApprovalStatus {
	approvedBy: string;
	decision: "APPROVED" | "REJECTED";
	timestamp: string;
}

interface ApprovalStatusResponse {
	workflowId: number;
	applicantId: number;
	status: string;
	stage: number;
	riskManagerApproval: ApprovalStatus | null;
	accountManagerApproval: ApprovalStatus | null;
	bothApproved: boolean;
}

interface FinalApprovalProps {
	workflowId: number;
	applicantId: number;
	/** Whether the contract has been signed */
	contractSigned: boolean;
	/** Whether ABSA approval has been confirmed (internal handoff) */
	absaFormComplete: boolean;
	/** Current workflow status */
	workflowStatus?: string;
	/** Current user role — determines which approval button to show */
	userRole?: "risk_manager" | "account_manager";
	/** Callback when approval is successful */
	onApprovalComplete?: () => void;
}

interface ChecklistItem {
	id: string;
	label: string;
	description: string;
	checked: boolean;
	icon: React.ElementType;
}

// ============================================
// Checklist Item Component
// ============================================

function ChecklistItemRow({ item, isLast }: { item: ChecklistItem; isLast: boolean }) {
	const Icon = item.icon;
	const CheckIcon = item.checked ? RiCheckboxCircleLine : RiCheckboxBlankCircleLine;

	return (
		<div
			className={cn(
				"flex items-start gap-3 py-3",
				!isLast && "border-b border-secondary/10"
			)}>
			<div
				className={cn(
					"p-2 rounded-lg shrink-0",
					item.checked ? "bg-emerald-500/10" : "bg-muted"
				)}>
				<Icon
					className={cn(
						"h-4 w-4",
						item.checked ? "text-emerald-400" : "text-muted-foreground"
					)}
				/>
			</div>
			<div className="flex-1 min-w-0">
				<p
					className={cn(
						"text-sm font-medium",
						item.checked ? "text-foreground" : "text-muted-foreground"
					)}>
					{item.label}
				</p>
				<p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
			</div>
			<CheckIcon
				className={cn(
					"h-5 w-5 shrink-0",
					item.checked ? "text-emerald-400" : "text-muted-foreground/40"
				)}
			/>
		</div>
	);
}

// ============================================
// Final Approval Card Component (Two-Factor)
// ============================================

/**
 * FinalApprovalCard — SOP Stage 6 (Two-Factor Approval)
 *
 * Shows a checklist of requirements plus two-factor approval buttons.
 * Both Risk Manager and Account Manager must approve to complete onboarding.
 */
export function FinalApprovalCard({
	workflowId,
	applicantId,
	contractSigned,
	absaFormComplete,
	workflowStatus,
	userRole = "account_manager",
	onApprovalComplete,
}: FinalApprovalProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const { data: approvalData, mutate: mutateApprovalStatus } =
		useSWR<ApprovalStatusResponse>(
			`/api/onboarding/approve?workflowId=${workflowId}`,
			async (url: string) => {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error("Failed to fetch approval status");
				}
				return (await response.json()) as ApprovalStatusResponse;
			},
			{
				refreshInterval: current => {
					if (!current) return 4000;
					return current.bothApproved || workflowStatus === "completed" ? 0 : 4000;
				},
			}
		);

	const riskManagerApproval = approvalData?.riskManagerApproval ?? null;
	const accountManagerApproval = approvalData?.accountManagerApproval ?? null;

	const canApprove = contractSigned && absaFormComplete;
	const bothApproved =
		riskManagerApproval?.decision === "APPROVED" &&
		accountManagerApproval?.decision === "APPROVED";

	const hasUserApproved =
		userRole === "risk_manager"
			? riskManagerApproval?.decision === "APPROVED"
			: accountManagerApproval?.decision === "APPROVED";

	const checklistItems: ChecklistItem[] = [
		{
			id: "contract",
			label: "Contract Signed",
			description: "The service agreement has been signed by all parties",
			checked: contractSigned,
			icon: RiContractLine,
		},
		{
			id: "absa_form",
			label: "ABSA Approval Confirmed",
			description: "Bank integration form has been completed and verified",
			checked: absaFormComplete,
			icon: RiFileTextLine,
		},
		{
			id: "risk_manager",
			label: "Risk Manager Approval",
			description:
				riskManagerApproval?.decision === "APPROVED"
					? `Approved by ${riskManagerApproval.approvedBy}`
					: "Awaiting Risk Manager approval",
			checked: riskManagerApproval?.decision === "APPROVED",
			icon: RiShieldCheckLine,
		},
		{
			id: "account_manager",
			label: "Account Manager Approval",
			description:
				accountManagerApproval?.decision === "APPROVED"
					? `Approved by ${accountManagerApproval.approvedBy}`
					: "Awaiting Account Manager approval",
			checked: accountManagerApproval?.decision === "APPROVED",
			icon: RiUserLine,
		},
	];

	const completedCount = checklistItems.filter(item => item.checked).length;

	const handleApprove = async (decision: "APPROVED" | "REJECTED") => {
		if (!canApprove && decision === "APPROVED") return;

		setIsSubmitting(true);
		setError(null);

		try {
			const approvalPromise = (async () => {
				const response = await fetch("/api/onboarding/approve", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						workflowId,
						applicantId,
						role: userRole,
						decision,
					}),
				});

				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(data.error || "Failed to submit approval");
				}

				return await response.json();
			})();
			await toast.promise(approvalPromise, {
				loading: "Recording approval...",
				success: "Approval recorded.",
				error: err => (err instanceof Error ? err.message : "Failed to submit approval"),
			});
			const result = await approvalPromise;
			await mutateApprovalStatus();
			if (result.bothApproved) {
				setSuccess(true);
				onApprovalComplete?.();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unexpected error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	// Already completed state
	if (success || bothApproved || workflowStatus === "completed") {
		return (
			<Card className="bg-emerald-500/5 border-emerald-500/20">
				<CardContent className="pt-6">
					<div className="flex flex-col items-center text-center gap-3 py-4">
						<div className="p-3 rounded-full bg-emerald-500/10">
							<RiCheckLine className="h-8 w-8 text-emerald-400" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-emerald-400">
								Onboarding Complete
							</h3>
							<p className="text-sm text-muted-foreground mt-1">
								Both Risk Manager and Account Manager have approved. Onboarding is
								complete.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-card/50 border-border">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg flex items-center gap-2">
							<RiCheckboxCircleLine className="h-5 w-5 text-primary" />
							Two-Factor Final Approval
						</CardTitle>
						<CardDescription>
							Both Risk Manager and Account Manager must approve to complete onboarding
						</CardDescription>
					</div>
					<div className="text-right">
						<p className="text-2xl font-bold text-foreground">
							{completedCount}/{checklistItems.length}
						</p>
						<p className="text-[10px] text-muted-foreground uppercase tracking-wide">
							Completed
						</p>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Progress Bar */}
				<div className="h-2 rounded-full bg-black/20     overflow-hidden">
					<div
						className={cn(
							"h-full transition-all duration-500 rounded-full",
							completedCount === checklistItems.length ? "bg-emerald-500" : "bg-primary"
						)}
						style={{
							width: `${(completedCount / checklistItems.length) * 100}%`,
						}}
					/>
				</div>

				{/* Checklist */}
				<div className="rounded-lg border border-secondary/10 p-3">
					{checklistItems.map((item, index) => (
						<ChecklistItemRow
							key={item.id}
							item={item}
							isLast={index === checklistItems.length - 1}
						/>
					))}
				</div>

				{/* Error Message */}
				{error && (
					<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
						<p className="text-sm text-red-400">{error}</p>
					</div>
				)}

				{/* Action Buttons */}
				{hasUserApproved ? (
					<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
						<p className="text-sm text-emerald-400 font-medium">
							You have approved as {userRole.replace("_", " ")}. Waiting for the other
							approver.
						</p>
					</div>
				) : (
					<div className="flex gap-3">
						<Button
							className={cn(
								"flex-1 gap-2",
								canApprove && "bg-emerald-600 hover:bg-emerald-700"
							)}
							disabled={!canApprove || isSubmitting}
							onClick={() => handleApprove("APPROVED")}>
							{isSubmitting ? (
								<>
									<RiLoader4Line className="h-4 w-4 animate-spin" />
									Processing...
								</>
							) : (
								<>
									<RiCheckLine className="h-4 w-4" />
									Approve as{" "}
									{userRole === "risk_manager" ? "Risk Manager" : "Account Manager"}
								</>
							)}
						</Button>
						<Button
							variant="destructive"
							className="gap-2"
							disabled={isSubmitting}
							onClick={() => handleApprove("REJECTED")}>
							Reject
						</Button>
					</div>
				)}

				{/* Helper Text */}
				{!(canApprove || hasUserApproved) && (
					<p className="text-xs text-muted-foreground text-center">
						Contract and ABSA approval must be confirmed before approval
					</p>
				)}
			</CardContent>
		</Card>
	);
}
