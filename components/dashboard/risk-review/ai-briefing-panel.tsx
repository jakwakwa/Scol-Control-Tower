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
	if (!(isGeneratingSummary || aiSummary || summaryError)) {
		return null;
	}

	return (
		<div className="animate-in fade-in slide-in-from-top-4 duration-500">
			<div className="relative p-1 rounded-xl bg-linear-to-r from-violet-400/10 via-indigo-700/10 to-purple-900/05 bg-size-[200%_auto] animate-gradient-x border-violet-900">
				<div className="bg-linear-to-t from-[var(--charcoal-800)] via-inidgo-700/20 to-purple-800/20 rounded-lg p-8 h-full border-2  shadow-md shadow-violet-700/50 border-violet-700/50">
					<div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
						<Sparkles className="w-5 h-5 text-primary" />
						<h2 className="text-lg font-semibold text-foreground">AI Risk Analysis</h2>
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
						<div className="text-purple-300 text-base font-serif whitespace-pre-wrap leading-normal max-w-3xl">
							{aiSummary}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
