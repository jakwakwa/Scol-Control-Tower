import { Loader2, Sparkles } from "lucide-react";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";

export function AiBriefingPanel({
	isGeneratingSummary,
	aiSummary,
	summaryError,
}: {
	isGeneratingSummary: boolean;
	aiSummary: string | null;
	summaryError: string | null;
}) {
	if (!((isGeneratingSummary || aiSummary ) || summaryError)) {
		return null;
	}

	return (
		<div className="animate-in fade-in slide-in-from-top-4 duration-500">
			<div className="relative p-1 rounded-xl bg-linear-to-r from-violet-400/10 via-indigo-700/20 to-purple-900/05 bg-size-[200%_auto] animate-gradient-x border-teal-900">
				<div className="bg-linear-to-r from-cyan-950/10 to-purple-950/20 rounded-lg p-8 h-full border border-cyan-800">
					<div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/05">
						<Sparkles className="w-5 h-5 text-primary" />
						<h2 className="text-lg font-semibold text-foreground">AI Adjudication Briefing</h2>
						<RiskReviewBadge variant="ai">Beta</RiskReviewBadge>
					</div>

					{isGeneratingSummary && (
						<div className="flex flex-col items-center justify-center py-8 gap-3 text-muted">
							<Loader2 className="w-8 h-8 animate-spin text-primary" />
							<p className="animate-pulse">
								Synthesizing compliance data from 4 domains...
							</p>
						</div>
					)}

					{summaryError && <p className="text-destructive text-sm">{summaryError}</p>}

					{aiSummary && !isGeneratingSummary && (
						<div className="text-xs text-chart-1 whitespace-pre-wrap leading-relaxed">
							{aiSummary}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
