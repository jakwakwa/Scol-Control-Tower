import { RiCloseLine } from "@remixicon/react";
import {
	CheckCircle2,
	FileCheck,
	Fingerprint,
	Home,
	Landmark,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import { verifyIdentity } from "@/app/actions/verify-id";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import { SectionStatusBanner } from "@/components/dashboard/risk-review/section-status-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";
import { cn } from "@/lib/utils";

export function FicaSection({
	data,
	status,
	applicantId,
}: {
	data: RiskReviewData["ficaData"];
	status?: SectionStatus;
	applicantId?: number;
}) {
	type DocumentAiEntity = { type: string; value: string };
	const [isVerifying, setIsVerifying] = useState(false);
	const [verifyResultState, setVerifyResultState] = useState<DocumentAiEntity[] | null>(
		null
	);
	const [verifyError, setVerifyError] = useState<string | null>(null);

	const verifyResult = verifyResultState || data.documentAiResult;
	const isAlreadyVerified = !!data.documentAiResult;

	const handleVerifyId = async () => {
		if (!applicantId) return;
		setIsVerifying(true);
		setVerifyError(null);

		try {
			const res = await verifyIdentity(applicantId);
			if (res.error) {
				setVerifyError(res.error);
			} else if (res.data) {
				setVerifyResultState(res.data.entities);
			}
		} catch (e) {
			setVerifyError(e instanceof Error ? e.message : "An error occurred");
		} finally {
			setIsVerifying(false);
		}
	};
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
						<div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
							<Fingerprint className="w-10 h-10 text-muted-foreground" />
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

					{applicantId && (
						<div className="mt-8 pt-6 border-t border-border">
							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
								<div>
									<h5 className="font-semibold text-base text-foreground flex items-center gap-2">
										<Fingerprint className="w-8 h-8 text-emerald-500" />
										Document AI Identity Proofing
									</h5>
									<p className="text-xs text-muted-foreground mt-0.5">
										Advanced fraud detection and image manipulation analysis
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={handleVerifyId}
									disabled={isVerifying}
									className={cn(
										"relative overflow-hidden transition-all duration-300",
										!isVerifying &&
											"hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-500 shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]"
									)}>
									{isVerifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
									{isAlreadyVerified ? "Re-verify Document" : "Verify Identity Document"}
								</Button>
							</div>

							{verifyError && (
								<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4 flex items-center gap-2 text-sm text-destructive">
									<RiCloseLine className="w-4 h-4" />
									{verifyError}
								</div>
							)}

							{verifyResult && (
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-bottom-2 duration-500">
									{[
										{
											label: "Is Identity Document",
											type: "fraud_signals_is_identity_document",
										},
										{
											label: "Image Manipulation",
											type: "fraud_signals_image_manipulation",
										},
										{ label: "Suspicious Words", type: "fraud_signals_suspicious_words" },
									].map(signal => {
										const value =
											verifyResult.find((e: DocumentAiEntity) => e.type === signal.type)
												?.value || "N/A";
										const isPass = value === "PASS" || value === "YES";
										return (
											<div
												key={signal.type}
												className={cn(
													"relative p-4 rounded-xl border transition-all duration-500 overflow-hidden group",
													isPass
														? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
														: "bg-muted/30 border-border hover:border-border/80"
												)}>
												{/* Subtle background glow */}
												{isPass && (
													<div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/10 blur-2xl rounded-full" />
												)}

												<div className="flex items-center justify-between mb-2">
													<p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
														{signal.label}
													</p>
													{isPass ? (
														<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
													) : (
														<RiCloseLine className="w-3.5 h-3.5 text-muted-foreground" />
													)}
												</div>
												<div className="flex items-baseline gap-2">
													<p
														className={cn(
															"text-2xl font-bold tracking-tight mt-1 transition-colors",
															isPass ? "text-emerald-500" : "text-foreground"
														)}>
														{value}
													</p>
													{isPass && (
														<span className="text-[10px] text-emerald-500/60 font-medium">
															Verified
														</span>
													)}
												</div>
												<p className="text-[10px] text-muted-foreground mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
													{isPass
														? "No fraud signals detected"
														: "Verification inconclusive"}
												</p>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}
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

				<Card className="p-6">
					<div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
						<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
							<FileCheck className="w-5 h-5 text-muted-foreground" />
						</div>
						<div>
							<h4 className="font-medium text-foreground">VAT Verification</h4>
							<p className="text-xs text-muted-foreground">
								VAT number screening on applicant records
							</p>
						</div>
					</div>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<p className="text-xs text-muted-foreground">Verification Status</p>
							<RiskReviewBadge
								variant={
									data.vatVerification?.status === "verified"
										? "success"
										: data.vatVerification?.status === "not_verified"
											? "warning"
											: "default"
								}>
								{data.vatVerification?.status === "verified"
									? "VERIFIED"
									: data.vatVerification?.status === "not_verified"
										? "NOT VERIFIED"
										: "NOT CHECKED"}
							</RiskReviewBadge>
						</div>
						<div>
							<p className="text-xs text-muted-foreground mb-1">VAT Number</p>
							<p className="text-sm text-foreground font-medium">
								{data.vatVerification?.vatNumber || "Not provided"}
							</p>
						</div>
						{data.vatVerification?.tradingName ? (
							<div>
								<p className="text-xs text-muted-foreground mb-1">Trading Name</p>
								<p className="text-sm text-foreground">
									{data.vatVerification.tradingName}
								</p>
							</div>
						) : null}
						{data.vatVerification?.office ? (
							<div>
								<p className="text-xs text-muted-foreground mb-1">Office</p>
								<p className="text-sm text-foreground">{data.vatVerification.office}</p>
							</div>
						) : null}
						{data.vatVerification?.message ? (
							<div className="p-3 bg-muted/20 rounded-lg border border-border/50">
								<p className="text-xs text-muted-foreground">
									{data.vatVerification.message}
								</p>
							</div>
						) : null}
					</div>
				</Card>
			</div>
		</div>
	);
}
