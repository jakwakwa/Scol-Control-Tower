"use client";

import {
	RiAi,
	RiAlertLine,
	RiCloseLine,
	RiErrorWarningLine,
	RiLoader4Line,
} from "@remixicon/react";
import { useMemo, useState } from "react";
import { GlassCard } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Overlimit threshold in cents (R500,000 = 50,000,000 cents) */
const OVERLIMIT_THRESHOLD = 50000000;

interface QuoteApprovalFormProps {
	applicantId: number;
	workflowId: number;
	quoteId: number;
	status: string;
	initialAmount?: number | null;
	initialBaseFeePercent?: number | null;
	initialAdjustedFeePercent?: number | null;
	initialRationale?: string | null;
	details?: string | null;
}

interface QuoteFormErrors {
	amount?: string;
	baseFeePercent?: string;
	adjustedFeePercent?: string;
	rationale?: string;
}

export function QuoteApprovalForm({
	quoteId,
	status,
	initialAmount,
	initialBaseFeePercent,
	initialAdjustedFeePercent,
	initialRationale,
	details,
}: QuoteApprovalFormProps) {
	const [currentStatus, setCurrentStatus] = useState(status);
	const [amount, setAmount] = useState(
		initialAmount !== null && initialAmount !== undefined ? String(initialAmount) : ""
	);
	const [baseFeePercent, setBaseFeePercent] = useState(
		initialBaseFeePercent !== null && initialBaseFeePercent !== undefined
			? String(initialBaseFeePercent)
			: ""
	);
	const [adjustedFeePercent, setAdjustedFeePercent] = useState(
		initialAdjustedFeePercent !== null && initialAdjustedFeePercent !== undefined
			? String(initialAdjustedFeePercent)
			: ""
	);
	const [rationale, _setRationale] = useState(initialRationale || "");
	const [errors, setErrors] = useState<QuoteFormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);

	// --- Rejection State (Phase 2: Quote Rejection UI) ---
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [rejectReason, setRejectReason] = useState("");
	const [isRejecting, setIsRejecting] = useState(false);

	/** Check if quote amount exceeds the overlimit threshold */
	const isOverlimit = useMemo(() => {
		const amountValue = Number(amount);
		return amountValue > OVERLIMIT_THRESHOLD;
	}, [amount]);

	const _parsedDetails = useMemo(() => {
		if (!details) return null;
		try {
			return JSON.parse(details) as {
				riskFactors?: string[];
				recommendation?: string;
			};
		} catch {
			return null;
		}
	}, [details]);

	const isLocked =
		currentStatus === "pending_approval" ||
		currentStatus === "pending_signature" ||
		currentStatus === "approved";

	const validate = () => {
		const nextErrors: QuoteFormErrors = {};

		if (!amount || Number(amount) <= 0) {
			nextErrors.amount = "Amount is required.";
		}

		if (!baseFeePercent || Number(baseFeePercent) <= 0) {
			nextErrors.baseFeePercent = "Base fee is required.";
		}

		if (!adjustedFeePercent || Number(adjustedFeePercent) <= 0) {
			nextErrors.adjustedFeePercent = "Adjusted fee is required.";
		}

		if (!rationale.trim()) {
			nextErrors.rationale = "Rationale is required.";
		}

		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	};

	const handleApprove = async () => {
		if (!validate()) return;
		setIsSubmitting(true);
		setSubmitMessage(null);

		try {
			const updateResponse = await fetch(`/api/quotes/${quoteId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: Number(amount),
					baseFeePercent: Number(baseFeePercent),
					adjustedFeePercent: Number(adjustedFeePercent),
					rationale,
				}),
			});

			if (!updateResponse.ok) {
				const payload = await updateResponse.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to update quote");
			}

			const approveResponse = await fetch(`/api/quotes/${quoteId}/approve`, {
				method: "POST",
			});

			if (!approveResponse.ok) {
				const payload = await approveResponse.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to approve quote");
			}

			setCurrentStatus("pending_signature");
			setSubmitMessage("Quote approved and sent to client.");
		} catch (error) {
			setSubmitMessage(error instanceof Error ? error.message : "Approval failed");
		} finally {
			setIsSubmitting(false);
		}
	};

	/**
	 * Handle quote rejection (Phase 2: Quote Rejection UI)
	 * Calls POST /api/quotes/[id]/reject with reason and overlimit flag
	 */
	const handleReject = async () => {
		if (!rejectReason.trim()) {
			setSubmitMessage("Please provide a reason for rejection.");
			return;
		}

		setIsRejecting(true);
		setSubmitMessage(null);

		try {
			const response = await fetch(`/api/quotes/${quoteId}/reject`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					reason: rejectReason,
					isOverlimit,
				}),
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to reject quote");
			}

			setCurrentStatus("rejected");
			setSubmitMessage("Quote has been rejected.");
			setShowRejectModal(false);
			setRejectReason("");
		} catch (error) {
			setSubmitMessage(error instanceof Error ? error.message : "Rejection failed");
		} finally {
			setIsRejecting(false);
		}
	};

	return (
		<div className="space-y-6">
			<GlassCard className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-semibold">Quote details</h3>
						<p className="text-sm text-muted-foreground">
							Values are stored in cents and basis points.
						</p>
					</div>
					<div className="flex items-center gap-3">
						<Badge
							variant="outline"
							className={`text-xs uppercase ${
								currentStatus === "rejected"
									? "text-red-400 border-red-500/40"
									: currentStatus === "pending_approval"
										? "text-warning"
										: currentStatus === "pending_signature"
											? "text-blue-600 bg-blue-100 border-blue-500/40"
											: currentStatus === "approved"
												? "text-emerald-800 bg-emerald-100/40 border-emerald-500/40"
												: "text-foreground"
							}`}>
							{currentStatus}
						</Badge>
						{isOverlimit && (
							<Badge
								variant="outline"
								className="text-xs uppercase text-muted-foreground border-muted-foreground/40 gap-1">
								<RiAlertLine className="h-3 w-3" />
								Overlimit
							</Badge>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label htmlFor="quote-amount">Amount (cents)</Label>
						<Input
							id="quote-amount"
							className="font-mono font-light text-muted"
							type="number"
							value={amount}
							onChange={event => setAmount(event.target.value)}
							disabled={isLocked}
						/>
						{errors.amount ? (
							<p className="text-xs text-destructive">{errors.amount}</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="quote-base-fee">Base fee (bps)</Label>
						<Input
							id="quote-base-fee"
							className=" font-mono text-xl font-light text-muted"
							type="number"
							value={baseFeePercent}
							onChange={event => setBaseFeePercent(event.target.value)}
							disabled={isLocked}
						/>
						{errors.baseFeePercent ? (
							<p className="text-xs text-destructive">{errors.baseFeePercent}</p>
						) : null}
					</div>

					<div className="space-y-2">
						<Label htmlFor="quote-adjusted-fee">Adjusted fee (bps)</Label>
						<Input
							id="quote-adjusted-fee"
							className=" font-mono text-xl font-light text-muted"
							type="number"
							value={adjustedFeePercent}
							onChange={event => setAdjustedFeePercent(event.target.value)}
							disabled={isLocked}
						/>
						{errors.adjustedFeePercent ? (
							<p className="text-xs text-destructive">{errors.adjustedFeePercent}</p>
						) : null}
					</div>
				</div>

				<div className="space-y-2 mt-4">
					<Label
						htmlFor="quote-rationale"
						className="text-violet-400/90 uppercase italic text-sm">
						<RiAi color="var(--color-violet-600)" className="mb-2" />
						Analysis
					</Label>
					{/* <Textarea
						id="quote-rationale"
						className="border-input-border font-mono font-light text-violet-400"
						style={{ fontSize: "1rem" }}
						value={rationale}
						onChange={(event) => setRationale(event.target.value)}
						disabled={isLocked}
						rows={5}
					/> */}
					<p className="bg-violet-900/5 outline-2 text-sm font-mono outline-violet-500 text-violet-400 p-4 rounded-lg">
						{rationale}
					</p>
				</div>
			</GlassCard>

			{/* Overlimit Warning Banner */}
			{isOverlimit && (
				<div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
					<RiErrorWarningLine className="h-5 w-5 text-orange-400 shrink-0" />
					<div>
						<p className="text-sm font-medium text-orange-400">
							Quote exceeds limit threshold
						</p>
						<p className="text-xs text-muted-foreground">
							This quote amount exceeds R{(OVERLIMIT_THRESHOLD / 100).toLocaleString()}.
							Additional review may be required before approval.
						</p>
					</div>
				</div>
			)}

			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<p className="text-sm text-warning">
					{submitMessage || "*Review the quote before sending to the client."}
				</p>
				<div className="flex gap-2">
					{/* Reject Button */}
					{currentStatus === "rejected" || currentStatus === "approved" ? null : (
						<Button
							variant="outline"
							onClick={() => setShowRejectModal(true)}
							disabled={isSubmitting || isRejecting}
							className="gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10">
							<RiCloseLine className="h-4 w-4" />
							Reject Quote
						</Button>
					)}
					{/* Approve Button */}
					{currentStatus === "rejected" || currentStatus === "approved" ? null : (
						<Button
							onClick={handleApprove}
							disabled={isSubmitting || isRejecting || isLocked}
							className="gap-2">
							{isSubmitting ? (
								<>
									<RiLoader4Line className="h-4 w-4 animate-spin" />
									Sending...
								</>
							) : (
								"Approve & Send to Client"
							)}
						</Button>
					)}
				</div>
			</div>

			{/* Quote Rejection Modal */}
			<Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
				<DialogContent className="max-w-md border-secondary/10 bg-zinc-100 backdrop-blur-xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-red-400">
							<RiCloseLine className="h-5 w-5" />
							Reject Quote
						</DialogTitle>
						<DialogDescription>
							Please provide a reason for rejecting this quote. This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>

					<div className="py-4 space-y-4">
						{isOverlimit && (
							<div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
								<RiAlertLine className="h-4 w-4 text-orange-400" />
								<span className="text-xs text-orange-400">
									This quote exceeds the overlimit threshold
								</span>
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="reject-reason">Rejection Reason</Label>
							<Textarea
								id="reject-reason"
								placeholder="Enter the reason for rejection..."
								value={rejectReason}
								onChange={e => setRejectReason(e.target.value)}
								rows={4}
								className="resize-none"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setShowRejectModal(false)}
							disabled={isRejecting}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleReject}
							disabled={isRejecting || !rejectReason.trim()}
							className="gap-2">
							{isRejecting ? (
								<>
									<RiLoader4Line className="h-4 w-4 animate-spin" />
									Rejecting...
								</>
							) : (
								"Confirm Rejection"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
