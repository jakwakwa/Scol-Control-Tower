import { RiAiGenerate2 } from "@remixicon/react";
import { Check, Download, FileText, Loader2 } from "lucide-react";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import { Button } from "@/components/ui/button";
import type { RiskReviewData } from "@/lib/risk-review/types";

export function RiskReviewHeader({
	globalData,
	isGeneratingSummary,
	canExport,
	exportHint,
	onGenerateSummary,
	onPrint,
	onAdjudicate,
}: {
	globalData: RiskReviewData["globalData"];
	isGeneratingSummary: boolean;
	canExport: boolean;
	exportHint: string;
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

			<div className="flex flex-col items-start md:items-end gap-2">
				<div className="flex flex-wrap items-center gap-1">
					<Button
						variant="outline"
						size="sm"
						className="aiBtn  bg-purple-500/40 h-9 text-violet-400 gap-3"
						onClick={onGenerateSummary}
						disabled={isGeneratingSummary}>
						{isGeneratingSummary ? (
							<Loader2 className="w-8 h-8 animate-spin" />
						) : (
							<RiAiGenerate2 className="text-purple-400 animate-pulse w-3 h-3 p-0.5" />
						)}
						{isGeneratingSummary ? "Analyzing..." : " Brief"}
					</Button>
					<Button
						variant="secondary"
						onClick={onPrint}
						className="bg-gray-700"
						disabled={!canExport}
						title={exportHint}>
						<Download className="w-4 h-4" /> Export Master PDF
					</Button>
					<Button
						variant="link"
						className="px-5 py-1 transition-all flex items-center gap-2 bg-emerald-700 text-emerald-300"
						onClick={onAdjudicate}>
						<Check className="w-4 h-4" /> Final Adjudication
					</Button>
				</div>
				<p className="text-xs text-muted-foreground md:text-right max-w-md">
					{exportHint}
				</p>
			</div>
		</header>
	);
}
