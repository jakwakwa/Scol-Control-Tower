"use client";

import { Building2, Loader2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	IndustryRegulatorReviewData,
	RiskReviewData,
	SocialReputationReviewData,
} from "@/lib/risk-review/types";
import { IndustryRegulatorProviderSchema } from "@/lib/services/agents/contracts/firecrawl-check.contracts";

const AUTO_PROVIDER = "__auto__";

const REGULATOR_PROVIDERS = IndustryRegulatorProviderSchema.options;

type ExternalSlot = {
	status: string;
	result?: Record<string, unknown>;
};

function slotToIndustryReview(slot: ExternalSlot): IndustryRegulatorReviewData {
	const r = slot.result;
	const status: IndustryRegulatorReviewData["status"] =
		slot.status === "live" ? "live" : slot.status === "offline" ? "offline" : "unknown";
	if (!r || typeof r !== "object") {
		return { status };
	}
	const evidence = r.evidence;
	const first =
		Array.isArray(evidence) &&
		evidence.length > 0 &&
		evidence[0] &&
		typeof evidence[0] === "object" &&
		!Array.isArray(evidence[0])
			? (evidence[0] as Record<string, unknown>)
			: undefined;
	const meta =
		r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
			? (r.metadata as Record<string, unknown>)
			: undefined;
	return {
		status,
		runtimeState: typeof r.runtimeState === "string" ? r.runtimeState : undefined,
		checked: typeof r.checked === "boolean" ? r.checked : undefined,
		passed: typeof r.passed === "boolean" ? r.passed : undefined,
		checkedAt: typeof r.checkedAt === "string" ? r.checkedAt : undefined,
		provider: typeof meta?.provider === "string" ? meta.provider : undefined,
		registrationStatus:
			typeof first?.registrationStatus === "string" ? first.registrationStatus : undefined,
		evidenceMatchName: typeof first?.matchedName === "string" ? first.matchedName : undefined,
	};
}

function slotToSocialReview(slot: ExternalSlot): SocialReputationReviewData {
	const r = slot.result;
	const status: SocialReputationReviewData["status"] =
		slot.status === "live" ? "live" : slot.status === "offline" ? "offline" : "unknown";
	if (!r || typeof r !== "object") {
		return { status };
	}
	const evidence = r.evidence;
	const first =
		Array.isArray(evidence) &&
		evidence.length > 0 &&
		evidence[0] &&
		typeof evidence[0] === "object" &&
		!Array.isArray(evidence[0])
			? (evidence[0] as Record<string, unknown>)
			: undefined;
	const details =
		first?.details && typeof first.details === "object" && !Array.isArray(first.details)
			? (first.details as Record<string, unknown>)
			: undefined;
	return {
		status,
		runtimeState: typeof r.runtimeState === "string" ? r.runtimeState : undefined,
		checked: typeof r.checked === "boolean" ? r.checked : undefined,
		passed: typeof r.passed === "boolean" ? r.passed : undefined,
		checkedAt: typeof r.checkedAt === "string" ? r.checkedAt : undefined,
		summaryRating: typeof r.summaryRating === "number" ? r.summaryRating : undefined,
		complaintCount: typeof r.complaintCount === "number" ? r.complaintCount : undefined,
		complimentCount: typeof r.complimentCount === "number" ? r.complimentCount : undefined,
		businessName:
			typeof first?.matchedName === "string"
				? first.matchedName
				: typeof details?.businessName === "string"
					? details.businessName
					: undefined,
	};
}

function IndustrySummary({ data }: { data: IndustryRegulatorReviewData }) {
	return (
		<dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
			<div>
				<dt className="text-muted-foreground">Source status</dt>
				<dd className="font-medium">{data.status}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Runtime</dt>
				<dd className="font-medium">{data.runtimeState ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Provider</dt>
				<dd className="font-medium">{data.provider ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Register match</dt>
				<dd className="font-medium">{data.evidenceMatchName ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Registration status</dt>
				<dd className="font-medium">{data.registrationStatus ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Passed</dt>
				<dd className="font-medium">
					{data.passed === undefined ? "—" : data.passed ? "Yes" : "No"}
				</dd>
			</div>
			<div className="sm:col-span-2">
				<dt className="text-muted-foreground">Checked at</dt>
				<dd className="font-medium">{data.checkedAt ?? "—"}</dd>
			</div>
		</dl>
	);
}

function SocialSummary({ data }: { data: SocialReputationReviewData }) {
	return (
		<dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
			<div>
				<dt className="text-muted-foreground">Source status</dt>
				<dd className="font-medium">{data.status}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Runtime</dt>
				<dd className="font-medium">{data.runtimeState ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Business</dt>
				<dd className="font-medium">{data.businessName ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Summary score (0–100)</dt>
				<dd className="font-medium">{data.summaryRating ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Complaints</dt>
				<dd className="font-medium">{data.complaintCount ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Compliments</dt>
				<dd className="font-medium">{data.complimentCount ?? "—"}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Passed heuristic</dt>
				<dd className="font-medium">
					{data.passed === undefined ? "—" : data.passed ? "Yes" : "No"}
				</dd>
			</div>
			<div className="sm:col-span-2">
				<dt className="text-muted-foreground">Checked at</dt>
				<dd className="font-medium">{data.checkedAt ?? "—"}</dd>
			</div>
		</dl>
	);
}

export function ExternalScreeningPanel({
	applicantId,
	industryInitial,
	socialInitial,
}: {
	applicantId: number;
	industryInitial?: RiskReviewData["industryRegulatorCheck"];
	socialInitial?: RiskReviewData["socialReputationCheck"];
}) {
	const router = useRouter();
	const [providerChoice, setProviderChoice] = useState<string>(AUTO_PROVIDER);
	const [industry, setIndustry] = useState(industryInitial);
	const [social, setSocial] = useState(socialInitial);
	const [industryLoading, setIndustryLoading] = useState(false);
	const [socialLoading, setSocialLoading] = useState(false);
	const [industryError, setIndustryError] = useState<string | null>(null);
	const [socialError, setSocialError] = useState<string | null>(null);

	useEffect(() => {
		setIndustry(industryInitial);
	}, [industryInitial]);

	useEffect(() => {
		setSocial(socialInitial);
	}, [socialInitial]);

	const runIndustry = useCallback(async () => {
		setIndustryLoading(true);
		setIndustryError(null);
		try {
			const body =
				providerChoice !== AUTO_PROVIDER ? { provider: providerChoice } : undefined;
			const res = await fetch(
				`/api/risk-review/applicants/${applicantId}/checks/industry-regulator`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: body ? JSON.stringify(body) : "{}",
				}
			);
			const json: unknown = await res.json();
			if (!res.ok) {
				const msg =
					json && typeof json === "object" && "error" in json
						? String((json as { error: unknown }).error)
						: "Request failed";
				setIndustryError(msg);
				return;
			}
			const slot =
				json && typeof json === "object" && "externalCheck" in json
					? (json as { externalCheck: ExternalSlot }).externalCheck
					: undefined;
			if (slot) {
				setIndustry(slotToIndustryReview(slot));
			}
			router.refresh();
		} catch (e) {
			setIndustryError(e instanceof Error ? e.message : "Network error");
		} finally {
			setIndustryLoading(false);
		}
	}, [applicantId, providerChoice, router]);

	const runSocial = useCallback(async () => {
		setSocialLoading(true);
		setSocialError(null);
		try {
			const res = await fetch(
				`/api/risk-review/applicants/${applicantId}/checks/social-reputation`,
				{
					method: "POST",
				}
			);
			const json: unknown = await res.json();
			if (!res.ok) {
				const msg =
					json && typeof json === "object" && "error" in json
						? String((json as { error: unknown }).error)
						: "Request failed";
				setSocialError(msg);
				return;
			}
			const slot =
				json && typeof json === "object" && "externalCheck" in json
					? (json as { externalCheck: ExternalSlot }).externalCheck
					: undefined;
			if (slot) {
				setSocial(slotToSocialReview(slot));
			}
			router.refresh();
		} catch (e) {
			setSocialError(e instanceof Error ? e.message : "Network error");
		} finally {
			setSocialLoading(false);
		}
	}, [applicantId, router]);

	return (
		<div className="space-y-6">
			<Card className="overflow-hidden">
				<div className="p-5 border-b border-border bg-muted/30">
					<h3 className="font-medium text-foreground flex items-center gap-2">
						<Building2 className="w-4 h-4 text-primary" />
						Industry regulator register (Firecrawl)
					</h3>
					<p className="text-xs text-muted-foreground mt-1">
						Requires Firecrawl and{" "}
						<code className="text-[10px]">ENABLE_FIRECRAWL_INDUSTRY_REG</code> or{" "}
						<code className="text-[10px]">ENABLE_MANUAL_FIRECRAWL_SCREENING</code>.
					</p>
				</div>
				<div className="p-5 space-y-4">
					<div className="space-y-2 max-w-md">
						<Label htmlFor="regulator-provider">Regulator override</Label>
						<Select value={providerChoice} onValueChange={setProviderChoice}>
							<SelectTrigger id="regulator-provider">
								<SelectValue placeholder="Auto from industry" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={AUTO_PROVIDER}>Auto (from industry)</SelectItem>
								{REGULATOR_PROVIDERS.map(p => (
									<SelectItem key={p} value={p}>
										{p}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button type="button" onClick={runIndustry} disabled={industryLoading}>
						{industryLoading ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Running…
							</>
						) : (
							"Run industry regulator check"
						)}
					</Button>
					{industryError && (
						<p className="text-sm text-destructive">{industryError}</p>
					)}
					{industry ? (
						<IndustrySummary data={industry} />
					) : (
						<p className="text-sm text-muted-foreground">No saved register check yet.</p>
					)}
				</div>
			</Card>

			<Card className="overflow-hidden">
				<div className="p-5 border-b border-border bg-muted/30">
					<h3 className="font-medium text-foreground flex items-center gap-2">
						<MessageCircle className="w-4 h-4 text-primary" />
						Social reputation (HelloPeter)
					</h3>
					<p className="text-xs text-muted-foreground mt-1">
						Requires Firecrawl and{" "}
						<code className="text-[10px]">ENABLE_FIRECRAWL_SOCIAL_REP</code> or manual
						screening flag.
					</p>
				</div>
				<div className="p-5 space-y-4">
					<Button type="button" onClick={runSocial} disabled={socialLoading}>
						{socialLoading ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Running…
							</>
						) : (
							"Run HelloPeter reputation check"
						)}
					</Button>
					{socialError && <p className="text-sm text-destructive">{socialError}</p>}
					{social ? (
						<SocialSummary data={social} />
					) : (
						<p className="text-sm text-muted-foreground">
							No saved reputation check yet.
						</p>
					)}
				</div>
			</Card>
		</div>
	);
}
