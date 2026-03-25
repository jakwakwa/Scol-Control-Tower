import { Building2 } from "lucide-react";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import { Card } from "@/components/ui/card";
import type { RiskReviewData } from "@/lib/risk-review/types";

export function EntitySummaryCards({
	globalData,
}: {
	globalData: RiskReviewData["globalData"];
}) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
			<Card className="col-span-1 md:col-span-3 p-6 flex flex-col justify-center">
				<div className="flex items-center gap-4 mb-4">
					<div className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center">
						<Building2 className="w-6 h-6 text-primary" />
					</div>
					<div>
						<h2 className="text-xl font-semibold text-foreground">
							{globalData.entity.name}
						</h2>
						<p className="text-sm text-muted-foreground">
							Reg: {globalData.entity.registrationNumber} • {globalData.entity.entityType}
						</p>
					</div>
				</div>
				<div className="flex gap-2 flex-wrap">
					<RiskReviewBadge variant="gold">B-BBEE Lvl 2</RiskReviewBadge>
					<RiskReviewBadge variant="danger">1 Conflict Found</RiskReviewBadge>
					<RiskReviewBadge variant="warning">Adverse Media Found</RiskReviewBadge>
					<RiskReviewBadge variant="success">FICA Compliant</RiskReviewBadge>
				</div>
			</Card>

			<Card className="col-span-1 p-6 relative overflow-hidden flex flex-col items-center w-full justify-center">
				{/* <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" /> */}
				<h3 className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
					Overall Risk Score
				</h3>
				<p className="text-2xl font-bold text-chart-5 mb-2">
					{globalData.overallRiskScore}
				</p>
				<p className="text-xs text-muted-foreground text-center">
					Calculated from all modules
				</p>
			</Card>
		</div>
	);
}
