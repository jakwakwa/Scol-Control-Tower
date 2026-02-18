"use client";

import {
	RiAlarmWarningLine,
	RiCheckLine,
	RiCloseLine,
	RiExternalLinkLine,
	RiLoader4Line,
	RiShieldCheckLine,
} from "@remixicon/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface DeepLink {
	label: string;
	url: string;
	source: string;
}

export interface SanctionItem {
	applicantId: number;
	companyName: string | null;
	tradingName: string | null;
	registrationNumber: string | null;
	contactName: string | null;
	email: string | null;
	phone: string | null;
	businessType: string | null;
	sanctionStatus: string | null;
	flaggedAt: string | null;
	workflowId: number | null;
	workflowStatus: string | null;
	workflowStage: number | null;
	sanctionListSource: string;
	matchConfidence?: number;
	matchedEntity?: string;
	matchedListId?: string;
	adverseMediaCount: number;
	isPEP: boolean;
	riskLevel: string;
	narrative?: string;
	deepLinks: DeepLink[];
}

interface SanctionAdjudicationProps {
	items: SanctionItem[];
	onRefresh: () => void;
}

// ============================================
// Main Component
// ============================================

export function SanctionAdjudication({ items, onRefresh }: SanctionAdjudicationProps) {
	const [selectedItem, setSelectedItem] = useState<SanctionItem | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);

	const handleSelect = useCallback((item: SanctionItem) => {
		setSelectedItem(item);
		setIsSheetOpen(true);
	}, []);

	const handleClose = useCallback(() => {
		setIsSheetOpen(false);
		setSelectedItem(null);
	}, []);

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
				<RiShieldCheckLine className="h-12 w-12 mb-4 text-emerald-500/50" />
				<p className="text-lg font-medium">No flagged sanctions</p>
				<p className="text-sm">All applicants have cleared sanctions screening.</p>
			</div>
		);
	}

	return (
		<>
			{/* Queue */}
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{items.map(item => (
					<SanctionCard key={item.applicantId} item={item} onSelect={handleSelect} />
				))}
			</div>

			{/* Detail Sheet */}
			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto bg-background">
					{selectedItem && (
						<SanctionDetailPanel
							item={selectedItem}
							onClose={handleClose}
							onRefresh={onRefresh}
						/>
					)}
				</SheetContent>
			</Sheet>
		</>
	);
}

// ============================================
// Queue Card
// ============================================

function SanctionCard({
	item,
	onSelect,
}: {
	item: SanctionItem;
	onSelect: (item: SanctionItem) => void;
}) {
	return (
		<Card
			className="cursor-pointer border-destructive/30 bg-destructive/5 hover:border-destructive/50 transition-all duration-200 group"
			onClick={() => onSelect(item)}>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base font-semibold">
							{item.companyName || "Unknown Company"}
						</CardTitle>
						<p className="text-xs text-muted-foreground mt-0.5">
							{item.contactName || "Unknown Contact"} · {item.registrationNumber || "—"}
						</p>
					</div>
					<Badge variant="destructive" className="shrink-0">
						<RiAlarmWarningLine className="h-3 w-3 mr-1" />
						FLAGGED
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Source</span>
					<span className="font-medium text-xs">{item.sanctionListSource}</span>
				</div>
				{item.matchedEntity && (
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Matched Entity</span>
						<span className="font-medium text-destructive text-xs truncate max-w-[180px]">
							{item.matchedEntity}
						</span>
					</div>
				)}
				{item.matchConfidence !== undefined && (
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Match Confidence</span>
						<span
							className={cn(
								"font-semibold text-xs",
								item.matchConfidence >= 80 ? "text-destructive" : "text-amber-500"
							)}>
							{item.matchConfidence}%
						</span>
					</div>
				)}
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Flagged</span>
					<span className="text-xs">
						{item.flaggedAt ? new Date(item.flaggedAt).toLocaleDateString("en-ZA") : "—"}
					</span>
				</div>
				<p className="text-xs text-muted-foreground mt-2 group-hover:text-foreground transition-colors">
					Click to review and adjudicate →
				</p>
			</CardContent>
		</Card>
	);
}

// ============================================
// Detail Panel (Side-by-Side Comparison)
// ============================================

function SanctionDetailPanel({
	item,
	onClose,
	onRefresh,
}: {
	item: SanctionItem;
	onClose: () => void;
	onRefresh: () => void;
}) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);

	// Clear form state
	const [clearReason, setClearReason] = useState("");
	const [isFalsePositive, setIsFalsePositive] = useState(false);

	const handleClear = useCallback(async () => {
		if (!clearReason.trim()) {
			toast.error("A clearance reason is required");
			return;
		}

		if (!item.workflowId) {
			toast.error("No workflow ID associated with this applicant");
			return;
		}

		setIsSubmitting(true);
		try {
			const res = await fetch("/api/sanctions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					applicantId: item.applicantId,
					workflowId: item.workflowId,
					action: "clear",
					reason: clearReason,
					isFalsePositive,
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to clear sanction");
			}

			toast.success("Sanction cleared — workflow resuming", {
				description: `${item.companyName} has been cleared and the onboarding workflow will resume.`,
			});
			onClose();
			onRefresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to clear sanction");
		} finally {
			setIsSubmitting(false);
		}
	}, [item, clearReason, isFalsePositive, onClose, onRefresh]);

	const handleConfirm = useCallback(async () => {
		if (!item.workflowId) {
			toast.error("No workflow ID associated with this applicant");
			return;
		}

		setIsSubmitting(true);
		try {
			const res = await fetch("/api/sanctions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					applicantId: item.applicantId,
					workflowId: item.workflowId,
					action: "confirm",
					reason: "Sanction hit confirmed by compliance officer",
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to confirm sanction");
			}

			toast.success("Sanction confirmed — application terminated", {
				description: `${item.companyName} has been terminated due to confirmed sanction hit.`,
			});
			setShowConfirmDialog(false);
			onClose();
			onRefresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to confirm sanction");
		} finally {
			setIsSubmitting(false);
		}
	}, [item, onClose, onRefresh]);

	return (
		<div className="space-y-6">
			<SheetHeader>
				<SheetTitle className="flex items-center gap-2">
					<RiAlarmWarningLine className="h-5 w-5 text-destructive" />
					Sanction Adjudication
				</SheetTitle>
				<p className="text-sm text-muted-foreground">
					Compare applicant data against the watchlist match and verify below.
				</p>
			</SheetHeader>

			{/* Side-by-Side Comparison */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* Left: Applicant Data */}
				<Card className="border-border/50">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							Applicant Data
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<InfoRow label="Company Name" value={item.companyName} />
						<InfoRow label="Trading Name" value={item.tradingName} />
						<InfoRow label="Registration No." value={item.registrationNumber} />
						<InfoRow label="Contact" value={item.contactName} />
						<InfoRow label="Email" value={item.email} />
						<InfoRow label="Phone" value={item.phone} />
						<InfoRow label="Business Type" value={item.businessType} />
					</CardContent>
				</Card>

				{/* Right: Watchlist Match */}
				<Card className="border-destructive/30 bg-destructive/5">
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-semibold uppercase tracking-wider text-destructive">
							Watchlist Match
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<InfoRow label="Source List" value={item.sanctionListSource} highlight />
						<InfoRow label="Matched Entity" value={item.matchedEntity || "—"} highlight />
						<InfoRow label="List Entry ID" value={item.matchedListId || "—"} />
						<InfoRow
							label="Match Confidence"
							value={
								item.matchConfidence !== undefined ? `${item.matchConfidence}%` : "—"
							}
							highlight={item.matchConfidence !== undefined && item.matchConfidence >= 80}
						/>
						<InfoRow
							label="Adverse Media"
							value={`${item.adverseMediaCount} articles found`}
							highlight={item.adverseMediaCount > 0}
						/>
						<InfoRow
							label="PEP Status"
							value={item.isPEP ? "Yes — Politically Exposed" : "No"}
							highlight={item.isPEP}
						/>
						<InfoRow label="Risk Level" value={item.riskLevel} highlight />
					</CardContent>
				</Card>
			</div>

			{/* AI Narrative */}
			{item.narrative && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold">
							AI Sanctions Agent Narrative
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
							{item.narrative}
						</p>
					</CardContent>
				</Card>
			)}

			<Separator />

			{/* Deep Links */}
			<div>
				<h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
					<RiExternalLinkLine className="h-4 w-4" />
					Verification Sources
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{item.deepLinks.map((link, idx) => (
						<a
							key={idx}
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 rounded-lg border border-border/50 p-3 text-sm hover:bg-muted/50 transition-colors group">
							<RiExternalLinkLine className="h-4 w-4 text-blue-500 shrink-0 group-hover:text-blue-400" />
							<div className="min-w-0">
								<p className="font-medium truncate text-blue-500 group-hover:text-blue-400">
									{link.label}
								</p>
								<p className="text-xs text-muted-foreground">{link.source}</p>
							</div>
						</a>
					))}
				</div>
			</div>

			<Separator />

			{/* Actions */}
			<div className="space-y-4">
				<h3 className="text-sm font-semibold">Compliance Decision</h3>

				{/* Clear & Resume Form */}
				<Card className="border-emerald-500/30">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-emerald-500 flex items-center gap-2">
							<RiCheckLine className="h-4 w-4" />
							Clear & Resume
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="clearReason" className="text-xs font-medium">
								Clearance Reason <span className="text-destructive">*</span>
							</Label>
							<Textarea
								id="clearReason"
								placeholder="Explain why this sanction flag is being cleared (e.g., name mismatch, different jurisdiction, false positive confirmed via OFAC search)..."
								value={clearReason}
								onChange={e => setClearReason(e.target.value)}
								rows={3}
								className="mt-1.5"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="falsePositive"
								checked={isFalsePositive}
								onCheckedChange={checked => setIsFalsePositive(checked === true)}
							/>
							<Label htmlFor="falsePositive" className="text-xs">
								Verified as False Positive (name coincidence / no actual match)
							</Label>
						</div>
						<Button
							className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
							disabled={isSubmitting || !clearReason.trim()}
							onClick={handleClear}>
							{isSubmitting ? (
								<RiLoader4Line className="h-4 w-4 animate-spin mr-2" />
							) : (
								<RiCheckLine className="h-4 w-4 mr-2" />
							)}
							Clear Sanction & Resume Workflow
						</Button>
					</CardContent>
				</Card>

				{/* Confirm & Terminate */}
				<Card className="border-destructive/30">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-destructive flex items-center gap-2">
							<RiCloseLine className="h-4 w-4" />
							Confirm & Terminate
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-xs text-muted-foreground mb-3">
							Confirming this sanction match will immediately terminate the onboarding
							application. This action cannot be undone.
						</p>
						<Button
							variant="destructive"
							className="w-full"
							disabled={isSubmitting}
							onClick={() => setShowConfirmDialog(true)}>
							<RiCloseLine className="h-4 w-4 mr-2" />
							Confirm Sanction Hit & Terminate Application
						</Button>
					</CardContent>
				</Card>
			</div>

			{/* Confirmation Dialog */}
			<Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-destructive">Confirm Sanction Hit</DialogTitle>
						<DialogDescription>
							You are about to confirm that <strong>{item.companyName}</strong> is a true
							sanction match. This will immediately terminate the onboarding application
							and cannot be reversed.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							onClick={() => setShowConfirmDialog(false)}
							disabled={isSubmitting}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
							{isSubmitting ? (
								<RiLoader4Line className="h-4 w-4 animate-spin mr-2" />
							) : null}
							Yes, Confirm & Terminate
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ============================================
// Info Row Helper
// ============================================

function InfoRow({
	label,
	value,
	highlight = false,
}: {
	label: string;
	value: string | null | undefined;
	highlight?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<span className="text-muted-foreground shrink-0">{label}</span>
			<span
				className={cn(
					"font-medium text-right truncate max-w-[200px]",
					highlight && "text-destructive font-semibold"
				)}>
				{value || "—"}
			</span>
		</div>
	);
}
