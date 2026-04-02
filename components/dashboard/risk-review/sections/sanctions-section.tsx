"use client";

import { ChevronRight, Globe2, Newspaper, Users } from "lucide-react";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import { SectionStatusBanner } from "@/components/dashboard/risk-review/section-status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";

export function SanctionsSection({
	data,
	status,
}: {
	data: RiskReviewData["sanctionsData"];
	status?: SectionStatus;
}) {
	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<SectionStatusBanner status={status} label="Sanctions & AML" />

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<Card className="p-5 flex items-center justify-between">
					<div>
						<p className="text-sm text-muted-foreground mb-1">Global Sanctions</p>
						<p className="text-xl font-bold text-chart-4">Clear</p>
					</div>
					<div className="w-10 h-10 rounded-full bg-chart-4/10 flex items-center justify-center">
						<Globe2 className="w-5 h-5 text-chart-4" />
					</div>
				</Card>
				<Card className="p-5 flex items-center justify-between">
					<div>
						<p className="text-sm text-muted-foreground mb-1">PEP Matches</p>
						<p className="text-xl font-bold text-chart-4">0 Identified</p>
					</div>
					<div className="w-10 h-10 rounded-full bg-chart-4/10 flex items-center justify-center">
						<Users className="w-5 h-5 text-chart-4" />
					</div>
				</Card>
				<Card className="p-5 flex items-center justify-between border-warning/30">
					<div>
						<p className="text-sm text-muted-foreground mb-1">Adverse Media</p>
						<p className="text-xl font-bold text-warning-foreground">
							{data.adverseMedia} Hits
						</p>
					</div>
					<div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
						<Newspaper className="w-5 h-5 text-warning-foreground" />
					</div>
				</Card>
			</div>
			{data.alerts && data.alerts.length > 0 ? (
				<Card>
					<div className="p-5 border-b border-border bg-muted/30">
						<h3 className="font-medium text-foreground flex items-center gap-2">
							<Globe2 className="w-4 h-4 text-primary" />
							WorldCheck / AML Alerts
						</h3>
					</div>
					<div className="divide-y divide-border">
						{data.alerts !== null || data.alerts !== undefined
							? data.alerts.map((alert, idx) => (
									<div key={idx} className="p-5 hover:bg-muted/20 transition-colors">
										<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
											<div className="flex items-start gap-4">
												<RiskReviewBadge
													variant={alert.severity === "HIGH" ? "danger" : "warning"}>
													{alert.severity}
												</RiskReviewBadge>
												<div>
													<p className="font-medium text-foreground mb-1">
														{alert.title}
													</p>
													<p className="text-xs text-muted-foreground">
														Source: {alert.source} • Logged: {alert.date}
													</p>
												</div>
											</div>

											<div className="flex gap-2">
												<Button className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 px-2">
													Dossier <ChevronRight className="w-3 h-3" />
												</Button>
											</div>
										</div>
									</div>
								))
							: null}
					</div>
				</Card>
			) : (
				<div className="px-4 py-4 border-b border-border bg-card rounded-[7px]">
					<h3 className="font-medium text-foreground flex items-center gap-2">
						<Globe2 className="w-4 h-4 text-primary" />
						WorldCheck | AML Alerts | Industry Regulators
					</h3>
					<Badge variant="warning" className="border-amber-300/10 border-2 my-3">
						<span className="text-xs mt-0"> Currently not implemented </span>
					</Badge>
				</div>
			)}
		</div>
	);
}
