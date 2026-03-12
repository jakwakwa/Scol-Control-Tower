import { RiAiGenerate2 } from "@remixicon/react";
import { Check, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import type { RiskReviewData } from "@/lib/risk-review/types";

export function RiskReviewHeader({
	globalData,
	isGeneratingSummary,
	onGenerateSummary,
	onPrint,
	onAdjudicate,
}: {
	globalData: RiskReviewData["globalData"];
	isGeneratingSummary: boolean;
	onGenerateSummary: () => void;
	onPrint: () => void;
	onAdjudicate: () => void;
}) {
	return (
		<header className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-border">
			<div>
				<div className="flex items-center gap-3 mb-2">
					<h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary via-primary to-primary">
						Overall Risk Profile
					</h1>
					{globalData.overallStatus === "REVIEW REQUIRED" && (
						<RiskReviewBadge variant="warning">Manual Review Required</RiskReviewBadge>
					)}
				</div>
				<p className="text-muted-foreground text-sm flex items-center gap-2">
					<FileText className="w-4 h-4" />
					Report Ref: {globalData.transactionId}
					<span className="text-muted-foreground/60">|</span>
					Generated: {globalData.generatedAt}
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Button
					variant="ai"
					size="ai"
					className="aiBtn text-violet-400"
					onClick={onGenerateSummary}
					disabled={isGeneratingSummary}>
					{isGeneratingSummary ? (
						<Loader2 className="w-8 h-8 animate-spin" />
					) : (
						<RiAiGenerate2 className="text-purple-500 animate-pulse" />
					)}
					{isGeneratingSummary ? "Analyzing..." : " Brief"}
				</Button>
				<Button variant="default" onClick={onPrint}>
					<Download className="w-4 h-4" /> Export Master PDF
				</Button>
			<Button
				variant="link"
				className="px-5 py-2 transition-all flex items-center gap-2"
				onClick={onAdjudicate}>
				<Check className="w-4 h-4" /> Final Adjudication
			</Button>
			</div>
		</header>
	);
}
