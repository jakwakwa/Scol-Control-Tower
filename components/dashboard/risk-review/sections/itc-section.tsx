import {
	Activity,
	AlertOctagon,
	Banknote,
	CreditCard,
	Scale,
	ShieldAlert,
	Sparkles,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { RiskReviewBadge } from "@/components/dashboard/risk-review/risk-review-badge";
import { ScoreGauge } from "@/components/dashboard/risk-review/score-gauge";
import { SectionStatusBanner } from "@/components/dashboard/risk-review/section-status-banner";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RiskReviewData, SectionStatus } from "@/lib/risk-review/types";
import type { FinancialRiskAnalysisResult } from "@/lib/services/agents/financial-risk.agent";

function formatZARFromCents(cents: number): string {
	return new Intl.NumberFormat("en-ZA", {
		style: "currency",
		currency: "ZAR",
		minimumFractionDigits: 2,
	}).format(cents / 100);
}

function volatilityVariant(score: number): "success" | "warning" | "danger" {
	if (score <= 30) return "success";
	if (score <= 70) return "warning";
	return "danger";
}

function riskCategoryVariant(
	category: FinancialRiskAnalysisResult["creditRisk"]["riskCategory"]
): "success" | "warning" | "danger" {
	switch (category) {
		case "LOW":
			return "success";
		case "MEDIUM":
			return "warning";
		case "HIGH":
		case "VERY_HIGH":
			return "danger";
		default:
			return "warning";
	}
}

function BankBalanceCard({ a }: { a: FinancialRiskAnalysisResult["bankAnalysis"] }) {
	const v = volatilityVariant(a.volatilityScore);
	return (
		<Card className="p-5 border-l-4 border-l-primary/60 bg-card/50">
			<div className="flex items-center gap-3 mb-4">
				<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
					<Banknote className="w-5 h-5 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<h4 className="font-medium text-foreground truncate">{a.bankName}</h4>
					<p className="text-xs text-muted-foreground">{a.accountType}</p>
				</div>
				<RiskReviewBadge variant={v}>Volatility {a.volatilityScore}</RiskReviewBadge>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="p-3 bg-muted/30 rounded-lg">
					<span className="block text-xs text-muted-foreground mb-1">Avg balance</span>
					<span className="text-sm font-semibold text-foreground">
						{formatZARFromCents(a.averageBalance)}
					</span>
				</div>
				<div className="p-3 bg-muted/30 rounded-lg">
					<span className="block text-xs text-muted-foreground mb-1">Minimum</span>
					<span className="text-sm font-semibold text-foreground">
						{formatZARFromCents(a.minimumBalance)}
					</span>
				</div>
				<div className="p-3 bg-muted/30 rounded-lg">
					<span className="block text-xs text-muted-foreground mb-1">Maximum</span>
					<span className="text-sm font-semibold text-foreground">
						{formatZARFromCents(a.maximumBalance)}
					</span>
				</div>
			</div>
		</Card>
	);
}

function CashFlowCard({ c }: { c: FinancialRiskAnalysisResult["cashFlow"] }) {
	const netPositive = c.netCashFlow >= 0;
	return (
		<Card className="p-5 border-l-4 border-l-chart-4">
			<div className="flex items-center gap-3 mb-4">
				<TrendingUp className="w-5 h-5 text-chart-4" />
				<h4 className="font-medium text-foreground">Cash flow</h4>
				<RiskReviewBadge variant={c.regularIncomeDetected ? "success" : "warning"}>
					{c.regularIncomeDetected ? "Regular income" : "Irregular / unclear"}
				</RiskReviewBadge>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
				<div className="p-4 rounded-lg bg-muted/20 border border-border/50">
					<span className="text-xs text-muted-foreground uppercase tracking-wide">
						Total credits
					</span>
					<p className="text-lg font-bold text-chart-4 mt-1">
						{formatZARFromCents(c.totalCredits)}
					</p>
				</div>
				<div className="p-4 rounded-lg bg-muted/20 border border-border/50">
					<span className="text-xs text-muted-foreground uppercase tracking-wide">
						Total debits
					</span>
					<p className="text-lg font-bold text-foreground mt-1">
						{formatZARFromCents(c.totalDebits)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2 mb-3">
				{netPositive ? (
					<TrendingUp className="w-4 h-4 text-chart-4" />
				) : (
					<TrendingDown className="w-4 h-4 text-destructive" />
				)}
				<span className="text-sm text-muted-foreground">Net cash flow</span>
				<span
					className={`text-sm font-semibold ${netPositive ? "text-chart-4" : "text-destructive"}`}>
					{formatZARFromCents(c.netCashFlow)}
				</span>
			</div>
			<div className="space-y-2">
				<div className="flex justify-between text-xs text-muted-foreground">
					<span>Consistency</span>
					<span className="font-medium text-foreground">{c.consistencyScore}/100</span>
				</div>
				<Progress value={c.consistencyScore} className="h-2" />
			</div>
		</Card>
	);
}

function StabilityCard({ s }: { s: FinancialRiskAnalysisResult["stability"] }) {
	return (
		<Card
			className={`p-5 border-l-4 ${s.hasBounced ? "border-l-destructive bg-destructive/5" : "border-l-muted-foreground/40"}`}>
			<div className="flex items-center gap-3 mb-4">
				<ShieldAlert
					className={`w-5 h-5 ${s.hasBounced ? "text-destructive" : "text-muted-foreground"}`}
				/>
				<h4 className="font-medium text-foreground">Stability</h4>
				<span className="text-xs text-muted-foreground ml-auto">
					Score {s.overallScore}/100
				</span>
			</div>
			{s.hasBounced && (
				<div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
					<p className="text-sm font-medium text-destructive">Bounced transactions</p>
					<p className="text-xs text-muted-foreground mt-1">
						{s.bouncedCount} item(s) · {formatZARFromCents(s.bouncedAmount)}
					</p>
				</div>
			)}
			<div className="mb-3">
				<p className="text-xs text-muted-foreground mb-2">Est. monthly loan repayments</p>
				<p className="text-sm font-semibold">{formatZARFromCents(s.loanRepayments)}</p>
			</div>
			<div className="space-y-3">
				<div>
					<p className="text-xs text-muted-foreground mb-2">Debt indicators</p>
					{s.debtIndicators.length === 0 ? (
						<p className="text-xs text-chart-4">None flagged</p>
					) : (
						<div className="flex flex-wrap gap-1.5">
							{s.debtIndicators.map((d, i) => (
								<RiskReviewBadge
									key={i}
									variant="warning"
									className="max-w-full truncate">
									{d}
								</RiskReviewBadge>
							))}
						</div>
					)}
				</div>
				<div>
					<p className="text-xs text-muted-foreground mb-2">Gambling indicators</p>
					{s.gamblingIndicators.length === 0 ? (
						<p className="text-xs text-chart-4">None detected</p>
					) : (
						<div className="flex flex-wrap gap-1.5">
							{s.gamblingIndicators.map((g, i) => (
								<RiskReviewBadge key={i} variant="danger" className="max-w-full truncate">
									{g}
								</RiskReviewBadge>
							))}
						</div>
					)}
				</div>
			</div>
		</Card>
	);
}

function CreditRiskCard({
	cr,
	overall,
}: {
	cr: FinancialRiskAnalysisResult["creditRisk"];
	overall: number;
}) {
	return (
		<Card className="p-6 border-l-4 border-l-primary/40">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
				<div className="flex flex-col items-center justify-center bg-muted/20 rounded-xl px-0">
					<ScoreGauge score={cr.riskScore} label="AI Statements Score" max={100} />
					<RiskReviewBadge
						variant={riskCategoryVariant(cr.riskCategory)}
						className="mt-3">
						{cr.riskCategory.replace("_", " ")}
					</RiskReviewBadge>
					<p className="text-xs text-muted-foreground mt-2 text-center">
						Overall assessment:{" "}
						<span className="font-medium text-foreground">{overall}</span>
						/100
					</p>
				</div>
				<div className="space-y-4">
					<div className="p-3 rounded-lg bg-muted/30 border border-border/50">
						<span className="text-xs text-muted-foreground">Affordability ratio</span>
						<p className="text-2xl font-bold text-foreground mt-1">
							{cr.affordabilityRatio.toFixed(2)}
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							&gt;1 suggests income exceeds expenses
						</p>
					</div>
					<div>
						<div className="flex items-center gap-2 mb-2">
							<AlertOctagon className="w-4 h-4 text-destructive" />
							<span className="text-sm font-medium text-foreground">Red flags</span>
						</div>
						{cr.redFlags.length === 0 ? (
							<p className="text-xs text-muted-foreground">None listed</p>
						) : (
							<ul className="space-y-1.5">
								{cr.redFlags.map((f, i) => (
									<li
										key={i}
										className="text-xs text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1.5">
										{f}
									</li>
								))}
							</ul>
						)}
					</div>
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Activity className="w-4 h-4 text-chart-4" />
							<span className="text-sm font-medium text-foreground">
								Positive indicators
							</span>
						</div>
						{cr.positiveIndicators.length === 0 ? (
							<p className="text-xs text-muted-foreground">None listed</p>
						) : (
							<ul className="flex flex-wrap gap-1.5">
								{cr.positiveIndicators.map((p, i) => (
									<RiskReviewBadge
										key={i}
										variant="success"
										className="text-left whitespace-normal">
										{p}
									</RiskReviewBadge>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</Card>
	);
}

export function ItcSection({
	data,
	status,
	bankStatementAnalysis,
}: {
	data: RiskReviewData["itcData"];
	status?: SectionStatus;
	bankStatementAnalysis?: FinancialRiskAnalysisResult;
}) {
	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<SectionStatusBanner status={status} label="ITC Credit" />
			<div className="grid grid-cols-1 md:grid-cols-6 gap-2  overflow-hidden py-2 dotted-grid items-center h-full max-h-full min-h-[30vh]">
				<Card className="col-span-3 m-0 flex relative flex-col items-center justify-center h-full ">
					<ScoreGauge
						score={data.creditScore}
						label="Commercial Credit Score"
						max={999}
						inverse={true}
					/>
					<p className="leading-0 hidden text-xs text-primary font-medium">
						{data.scoreBand}
					</p>
				</Card>
				<div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-1 align-center py-0 my-0 min-h-full w-full">
					<Card className="px-5  border-l- border-l-chart-4">
						<div className="flex items-center gap-3 mb-2">
							<Scale className="w-5 h-5 text-chart-4" />
							<h4 className="font-medium text-foreground">Court Judgements</h4>
						</div>
						<p className="text-2xl font-bold text-foreground">{data.judgements}</p>
						<p className="text-xs text-muted-foreground mt-1">
							No active civil judgements recorded.
						</p>
					</Card>
					<Card className="px-5 py-12 h-auto content-start  border-l-4 border-l-warning min-w-68">
						<div className="w-full flex items-center gap-3 my-2">
							<AlertOctagon className="w-5 h-5 text-warning-foreground" />
							<h4 className="font-medium text-foreground">Payment Defaults</h4>
						</div>
						<p className="text-2xl font-bold text-foreground">{data.defaults}</p>
						<p className="text-xs text-warning-foreground/80 mt-1">
							{data.defaultDetails}
						</p>
					</Card>
					<Card className="h-full p-5 sm:col-span-2">
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

			{bankStatementAnalysis?.available === true && (
				<div className="space-y-4 pt-2">
					<div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
						<Sparkles className="w-4 h-4 text-primary shrink-0" />
						<span className="text-sm font-medium text-foreground">
							AI bank statement analysis
						</span>
						<span className="text-xs text-muted-foreground sm:ml-auto">
							Ai Analysis · Complementary to bureau
						</span>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<BankBalanceCard a={bankStatementAnalysis.bankAnalysis} />
						<CashFlowCard c={bankStatementAnalysis.cashFlow} />
						<div className="md:col-span-2">
							<StabilityCard s={bankStatementAnalysis.stability} />
						</div>
						<div className="md:col-span-2">
							<CreditRiskCard
								cr={bankStatementAnalysis.creditRisk}
								overall={bankStatementAnalysis.overall.score}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
