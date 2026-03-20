"use client";

import { AlertTriangle, Clock, ShieldAlert, Users } from "lucide-react";
import { useState } from "react";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import { SectionStatusBanner } from "@/components/dashboard/risk-review/section-status-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";

type ProcurementTab = "overview" | "directors" | "compliance";

export function ProcurementSection({
	data,
	status,
}: {
	data: RiskReviewData["procurementData"];
	status?: SectionStatus;
}) {
	const [activeSubTab, setActiveSubTab] = useState<ProcurementTab>("overview");

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<SectionStatusBanner status={status} label="Procurement" />

			{data.riskAlerts.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
						<ShieldAlert className="w-5 h-5 text-warning-foreground" />
						Procurement Exceptions
					</h3>
					<div className="grid grid-cols-1 gap-3">
						{data.riskAlerts.map((alert, idx) => (
							<div
								key={idx}
								className="p-4 rounded-lg border bg-warning/10 border-warning/20 flex flex-col md:flex-row md:items-center gap-4">
								<div className="p-2 rounded-full bg-warning/20 text-warning-foreground">
									<AlertTriangle className="w-5 h-5" />
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<RiskReviewBadge variant="warning">
											{alert.id} | {alert.category}
										</RiskReviewBadge>
									</div>
									<p className="text-foreground text-sm">{alert.message}</p>
									<p className="text-muted-foreground text-xs mt-1">
										Action: {alert.action}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="border-b-0 border-border">
				<nav className="flex space-x-1 border-b-0">
					{(["overview", "directors", "compliance"] as const).map(tab => (
						<Button
							key={tab}
							onClick={() => setActiveSubTab(tab)}
							className={`pb-4 text-sm font-medium capitalize transition-colors relative rounded-b-none ${
								activeSubTab === tab
									? "text-primary bg-secondary"
									: "text-muted-foreground bg-black/20     hover:text-foreground"
							}`}>
							{tab}
							{activeSubTab === tab && (
								<span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-b-0 rounded-t-sm" />
							)}
						</Button>
					))}
				</nav>
			</div>

			<div className="pt-2">
				{activeSubTab === "overview" && (
					<Card>
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
									<th className="p-4 font-medium">Verification Check</th>
									<th className="p-4 font-medium">Result</th>
									<th className="p-4 font-medium">Details</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/50 text-sm">
								{data.checks.map((check, idx) => (
									<tr key={idx} className="hover:bg-muted/20 transition-colors">
										<td className="p-4 font-medium text-foreground">{check.name}</td>
										<td className="p-4">
											<RiskReviewBadge
												variant={check.status === "PASS" ? "success" : "danger"}>
												{check.status}
											</RiskReviewBadge>
										</td>
										<td className="p-4 text-muted-foreground">{check.detail}</td>
									</tr>
								))}
							</tbody>
						</table>
					</Card>
				)}

				{activeSubTab === "directors" && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{data.directors.map((director, idx) => (
							<Card
								key={idx}
								className={`p-5 flex flex-col gap-4 ${
									director.status === "FLAGGED" ? "border-warning/30" : ""
								}`}>
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
											<Users className="w-5 h-5" />
										</div>
										<div>
											<h4 className="font-medium text-foreground">{director.name}</h4>
											<p className="text-xs text-muted-foreground">
												ID: {director.idNumber}
											</p>
										</div>
									</div>
									<RiskReviewBadge
										variant={director.status === "CLEARED" ? "success" : "warning"}>
										{director.status}
									</RiskReviewBadge>
								</div>
								<div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/30 text-sm">
									<div>
										<span className="block text-xs text-muted-foreground mb-1">
											Other Directorships
										</span>
										<span className="font-medium text-foreground">
											{director.otherDirectorships} Active
										</span>
									</div>
									<div>
										<span className="block text-xs text-muted-foreground mb-1">
											Identified Conflicts
										</span>
										<span
											className={`font-medium ${
												director.conflicts > 0
													? "text-warning-foreground"
													: "text-chart-4"
											}`}>
											{director.conflicts} Matches
										</span>
									</div>
								</div>
							</Card>
						))}
					</div>
				)}

				{activeSubTab === "compliance" && (
					<Card className="p-6">
						<div className="flex items-center gap-4 pb-6 border-b border-border">
							<div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
								<Clock className="w-6 h-6 text-muted-foreground" />
							</div>
							<div className="flex-1">
								<h4 className="text-foreground font-medium">B-BBEE Expiry Tracking</h4>
								<p className="text-sm text-muted-foreground">
									Certificate/Affidavit valid until {data.beeExpiry}
								</p>
							</div>
							<RiskReviewBadge variant="warning">Expires in 24 Days</RiskReviewBadge>
						</div>
					</Card>
				)}
			</div>
		</div>
	);
}
