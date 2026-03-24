import { CheckCircle2, FileCheck, Fingerprint, Home, Landmark } from "lucide-react";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import { SectionStatusBanner } from "@/components/dashboard/risk-review/section-status-banner";
import { Card } from "@/components/ui/card";
import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";

export function FicaSection({
	data,
	status,
}: {
	data: RiskReviewData["ficaData"];
	status?: SectionStatus;
}) {
	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<SectionStatusBanner status={status} label="FICA / KYC" />
			<div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
				<div className="flex items-center gap-3">
					<FileCheck className="w-5 h-5 text-chart-4" />
					<h3 className="font-medium text-foreground">KYC / FICA Verification</h3>
				</div>
				<p className="text-xs text-muted-foreground">
					Last verified: {data.lastVerified}
				</p>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card className="p-6 md:col-span-2">
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
						<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
							<Fingerprint className="w-5 h-5 text-muted-foreground" />
						</div>
						<div>
							<h4 className="font-medium text-foreground">Identity Document Validity</h4>
							<p className="text-xs text-muted-foreground">
								Validated against Department of Home Affairs (HANIS)
							</p>
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{data.identity.map((person, idx) => (
							<div
								key={idx}
								className="p-4 bg-muted/20 rounded-lg border border-border/50">
								<div className="flex items-start justify-between mb-3">
									<div>
										<p className="font-medium text-foreground">{person.name}</p>
										<p className="text-xs text-muted-foreground">{person.id}</p>
									</div>
									<RiskReviewBadge
										variant={person.status === "VERIFIED" ? "success" : "warning"}>
										{person.status}
									</RiskReviewBadge>
								</div>
								<div className="flex items-center gap-2 text-xs text-chart-4 bg-chart-4/10 px-2 py-1 rounded w-fit">
									<CheckCircle2 className="w-3 h-3" /> Status: {person.deceasedStatus}
								</div>
							</div>
						))}
					</div>
				</Card>

				<Card className="p-6">
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
						<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
							<Home className="w-5 h-5 text-muted-foreground" />
						</div>
						<div>
							<h4 className="font-medium text-foreground">Proof of Residence</h4>
							<p className="text-xs text-muted-foreground">FICA 90-day validity check</p>
						</div>
					</div>
					<div className="space-y-4">
						<div>
							<p className="text-xs text-muted-foreground mb-1">Declared Address</p>
							<p className="text-sm text-foreground font-medium">
								{data.residence.address}
							</p>
						</div>
						<div className="grid grid-cols-2 gap-3 pt-2">
							<div>
								<p className="text-xs text-muted-foreground mb-1">Document Used</p>
								<p className="text-sm text-foreground">{data.residence.documentType}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground mb-1">Document Age</p>
								<div className="flex items-center gap-2">
									<p className="text-sm font-medium text-chart-4">
										{data.residence.ageInDays} Days Old
									</p>
									<RiskReviewBadge variant="success">
										{data.residence.status}
									</RiskReviewBadge>
								</div>
							</div>
						</div>
					</div>
				</Card>

				<Card className="p-6">
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
						<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
							<Landmark className="w-5 h-5 text-muted-foreground" />
						</div>
						<div>
							<h4 className="font-medium text-foreground">Bank & Source of Funds</h4>
							<p className="text-xs text-muted-foreground">
								Account Verification System (AVS) & Statements
							</p>
						</div>
					</div>
					<div className="space-y-4">
						<div>
							<p className="text-xs text-muted-foreground mb-1">Verified Account</p>
							<p className="text-sm text-foreground font-medium">
								{data.banking.bankName} • {data.banking.accountNumber}
							</p>
						</div>
						<div className="p-3 bg-muted/20 rounded-lg border border-border/50">
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs text-muted-foreground">Bank AVS Response</span>
								<RiskReviewBadge variant="success">
									{data.banking.avsStatus}
								</RiskReviewBadge>
							</div>
							<p className="text-xs text-muted-foreground">{data.banking.avsDetails}</p>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}
