import { AlertOctagon, CreditCard, Scale } from "lucide-react";
import { ScoreGauge } from "@/components/dashboard/risk-review/score-gauge";
import { SectionStatusBanner } from "@/components/dashboard/risk-review/section-status-banner";
import { Card } from "@/components/ui/card";
import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";

export function ItcSection({
	data,
	status,
}: {
	data: RiskReviewData["itcData"];
	status?: SectionStatus;
}) {
	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<SectionStatusBanner status={status} label="ITC Credit" />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="col-span-1 p-6 flex flex-col items-center justify-center bg-muted/30">
					<ScoreGauge
						score={data.creditScore}
						label="Commercial Credit Score"
						max={999}
						inverse={true}
					/>
					<p className="text-sm text-primary font-medium mt-2">{data.scoreBand}</p>
				</Card>
				<div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Card className="p-5 border-l-4 border-l-chart-4">
						<div className="flex items-center gap-3 mb-2">
							<Scale className="w-5 h-5 text-chart-4" />
							<h4 className="font-medium text-foreground">Court Judgements</h4>
						</div>
						<p className="text-2xl font-bold text-foreground">{data.judgements}</p>
						<p className="text-xs text-muted-foreground mt-1">
							No active civil judgements recorded.
						</p>
					</Card>
					<Card className="p-5 border-l-4 border-l-warning">
						<div className="flex items-center gap-3 mb-2">
							<AlertOctagon className="w-5 h-5 text-warning-foreground" />
							<h4 className="font-medium text-foreground">Payment Defaults</h4>
						</div>
						<p className="text-2xl font-bold text-foreground">{data.defaults}</p>
						<p className="text-xs text-warning-foreground/80 mt-1">
							{data.defaultDetails}
						</p>
					</Card>
					<Card className="p-5 sm:col-span-2">
						<div className="flex items-center gap-3 mb-4">
							<CreditCard className="w-5 h-5 text-muted-foreground" />
							<h4 className="font-medium text-foreground">Credit Behaviour</h4>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="p-3 bg-muted/30 rounded-lg">
								<span className="block text-xs text-muted-foreground mb-1">
									Trade References
								</span>
								<span className="text-sm font-medium text-foreground">
									{data.tradeReferences}
								</span>
							</div>
							<div className="p-3 bg-muted/30 rounded-lg">
								<span className="block text-xs text-muted-foreground mb-1">
									Recent Credit Enquiries
								</span>
								<span className="text-sm font-medium text-foreground">
									{data.recentEnquiries}
								</span>
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
