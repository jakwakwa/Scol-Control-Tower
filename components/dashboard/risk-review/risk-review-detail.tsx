"use client";

import { RiAiGenerate2 } from "@remixicon/react";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Building2,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	CreditCard,
	Download,
	FileCheck,
	FileText,
	Fingerprint,
	Globe2,
	Home,
	Landmark,
	Loader2,
	Newspaper,
	Scale,
	ShieldAlert,
	Sparkles,
	Users,
} from "lucide-react";
import { useState } from "react";
import { analyzeMediaRisk, generateRiskBriefing } from "@/actions/ai.actions";
import { Button } from "@/components/ui/button";

export interface RiskReviewData {
	globalData: {
		transactionId: string;
		generatedAt: string;
		overallStatus: string;
		overallRiskScore: number;
		entity: {
			name: string;
			tradingAs?: string;
			registrationNumber?: string;
			entityType?: string;
			registeredAddress?: string;
		};
	};
	procurementData: {
		cipcStatus: string;
		taxStatus: string;
		taxExpiry: string;
		beeLevel: string;
		beeExpiry: string;
		riskAlerts: Array<{
			category: string;
			message: string;
			id?: string;
			action?: string;
		}>;
		checks: Array<{ name: string; status: string; detail: string }>;
		directors: Array<{
			name: string;
			idNumber: string;
			otherDirectorships: number;
			conflicts: number;
			status?: string;
		}>;
	};
	itcData: {
		creditScore: number;
		scoreBand: string;
		judgements: number | string;
		defaults: number | string;
		defaultDetails: string;
		tradeReferences: number | string;
		recentEnquiries: number | string;
	};
	sanctionsData: {
		sanctionsMatch: string;
		pepHits: number | string;
		adverseMedia: number | string;
		alerts: Array<{ date: string; source: string; title: string; severity: string }>;
	};
	ficaData: {
		identity: Array<{ name: string; id: string; status: string; deceasedStatus: string }>;
		residence: {
			address: string;
			documentType: string;
			ageInDays: number | string;
			status: string;
		};
		lastVerified: string;
		banking: {
			bankName: string;
			accountNumber: string;
			avsStatus: string;
			avsDetails: string;
		};
	};
}

// AI Service helpers have been extracted to Server Actions

// --- Screen UI Components ---

const Badge = ({
	children,
	variant = "default",
}: {
	children: React.ReactNode;
	variant?: "default" | "success" | "warning" | "danger" | "gold" | "ai";
}) => {
	const variants = {
		default: "bg-secondary/90 text-muted-foreground border-border",
		success: "bg-chart-4/10 text-chart-4 border-chart-4/20",
		warning: "bg-warning/50 text-warning-foreground border-warning",
		danger: "bg-destructive/20 text-destructive-foreground border-destructive/30",
		gold: "bg-primary/20 text-primary border-primary/30",
		ai: "bg-primary/10 text-primary border-primary/30",
	};
	return (
		<span
			className={`px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}>
			{children}
		</span>
	);
};

const Card = ({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) => (
	<div
		className={`glass-card border border-border rounded-xl overflow-hidden ${className}`}>
		{children}
	</div>
);

const ScoreGauge = ({
	score,
	label,
	max = 100,
	inverse = false,
}: {
	score: number;
	label: string;
	max?: number;
	inverse?: boolean;
}) => {
	const getColour = (val: number) => {
		const ratio = val / max;
		if (inverse) {
			if (ratio > 0.7) return "text-chart-4";
			if (ratio > 0.4) return "text-warning-foreground";
			return "text-destructive";
		} else {
			if (ratio < 0.3) return "text-chart-4";
			if (ratio < 0.7) return "text-warning-foreground";
			return "text-destructive";
		}
	};

	const percentage = (score / max) * 100;
	const dashoffset = 351.85 - (351.85 * percentage) / 100;

	return (
		<div className="flex flex-col items-center justify-center relative">
			<h3 className="text-sm text-muted-foreground font-medium mb-4 flex items-center gap-2">
				<Activity className="w-4 h-4" /> {label}
			</h3>
			<div className="relative flex items-center justify-center mb-2">
				<svg className="w-28 h-28 transform -rotate-90">
					<circle
						cx="56"
						cy="56"
						r="48"
						className="text-muted stroke-current"
						strokeWidth="8"
						fill="transparent"
					/>
					<circle
						cx="56"
						cy="56"
						r="48"
						className={`${getColour(score)} stroke-current transition-all duration-1000 ease-out`}
						strokeWidth="8"
						fill="transparent"
						strokeDasharray="351.85"
						strokeDashoffset={dashoffset}
						strokeLinecap="round"
					/>
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className={`text-3xl font-bold ${getColour(score)}`}>{score}</span>
				</div>
			</div>
		</div>
	);
};

// --- Printable Master Report Component (Hidden on Screen) ---
const PrintableAuditReport = ({
	aiSummary,
	data,
}: {
	aiSummary: string | null;
	data: RiskReviewData;
}) => {
	if (!data) return null;
	const { globalData, procurementData, itcData, sanctionsData, ficaData } = data;
	return (
		<div className="hidden print:block text-black bg-white font-sans p-8 max-w-4xl mx-auto text-sm">
			<div className="border-b-2 border-black pb-6 mb-6">
				<div className="flex justify-between items-end mb-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight uppercase">
							Master Compliance & Risk Audit Report
						</h1>
						<p className="text-gray-600 font-medium mt-1">CONFIDENTIAL & PRIVILEGED</p>
					</div>
					<div className="text-right">
						<p className="font-bold">Ref: {globalData.transactionId}</p>
						<p className="text-gray-600">Generated: {globalData.generatedAt}</p>
					</div>
				</div>
			</div>

			{/* AI Executive Summary injected into PDF if available */}
			{aiSummary && (
				<div className="mb-8 border-2 border-indigo-900 bg-indigo-50 p-4 rounded-sm">
					<h2 className="text-lg font-bold uppercase border-b border-indigo-200 pb-1 mb-3 text-indigo-900">
						AI Adjudication Briefing
					</h2>
					<div className="text-sm whitespace-pre-wrap text-black leading-relaxed">
						{aiSummary}
					</div>
					<p className="text-xs text-indigo-700 italic mt-3 pt-2 border-t border-indigo-200">
						* This summary was generated by AI risk analysis based on the data within this
						report.
					</p>
				</div>
			)}

			<div className="mb-8">
				<h2 className="text-lg font-bold uppercase border-b border-gray-300 pb-1 mb-3">
					1. Executive Summary
				</h2>
				<table className="w-full border-collapse border border-gray-300 mb-4">
					<tbody>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100 w-1/3">Subject Entity Name</td>
							<td className="p-2 w-2/3">
								{globalData.entity.name} (T/A {globalData.entity.tradingAs})
							</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Registration Number</td>
							<td className="p-2">
								{globalData.entity.registrationNumber} ({globalData.entity.entityType})
							</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Registered Address</td>
							<td className="p-2">{globalData.entity.registeredAddress}</td>
						</tr>
						<tr>
							<td className="p-2 font-bold bg-gray-100">Overall System Adjudication</td>
							<td className="p-2 font-bold uppercase">
								{globalData.overallStatus} (Risk Score: {globalData.overallRiskScore}/100)
							</td>
						</tr>
					</tbody>
				</table>

				{procurementData.riskAlerts.length > 0 && (
					<div className="border-l-4 border-black pl-4 py-2 my-4 bg-gray-50">
						<h3 className="font-bold uppercase text-red-700 mb-2">
							CRITICAL EXCEPTIONS IDENTIFIED
						</h3>
						{procurementData.riskAlerts.map((alert, idx) => (
							<p key={idx} className="mb-1">
								<span className="font-bold">{alert.category}:</span> {alert.message}
							</p>
						))}
					</div>
				)}
			</div>

			<div className="mb-8">
				<h2 className="text-lg font-bold uppercase border-b border-gray-300 pb-1 mb-3">
					2. Procurement & Governance (CIPC & SARS)
				</h2>
				<div className="grid grid-cols-2 gap-4 mb-4">
					<div>
						<p>
							<span className="font-bold">CIPC Status:</span> {procurementData.cipcStatus}
						</p>
						<p>
							<span className="font-bold">SARS Tax Clearance:</span>{" "}
							{procurementData.taxStatus} (Exp: {procurementData.taxExpiry})
						</p>
					</div>
					<div>
						<p>
							<span className="font-bold">B-BBEE Status:</span> Level{" "}
							{procurementData.beeLevel} (Exp: {procurementData.beeExpiry})
						</p>
						<p>
							<span className="font-bold">National Treasury Restr. List:</span> CLEAR
						</p>
					</div>
				</div>

				<h3 className="font-bold mt-4 mb-2">2.1 Active Directors & Conflict Matches</h3>
				<table className="w-full border-collapse border border-gray-300 text-sm">
					<thead className="bg-gray-100">
						<tr>
							<th className="border border-gray-300 p-2 text-left">Full Name</th>
							<th className="border border-gray-300 p-2 text-left">Identity Number</th>
							<th className="border border-gray-300 p-2 text-center">
								Other Directorships
							</th>
							<th className="border border-gray-300 p-2 text-center">Conflict Matches</th>
						</tr>
					</thead>
					<tbody>
						{procurementData.directors.map((d, idx) => (
							<tr key={idx}>
								<td className="border border-gray-300 p-2">{d.name}</td>
								<td className="border border-gray-300 p-2">{d.idNumber}</td>
								<td className="border border-gray-300 p-2 text-center">
									{d.otherDirectorships}
								</td>
								<td className="border border-gray-300 p-2 text-center font-bold">
									{d.conflicts > 0 ? `${d.conflicts} MATCHES` : "NONE"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="mb-8">
				<h2 className="text-lg font-bold uppercase border-b border-gray-300 pb-1 mb-3">
					3. Commercial Credit Profile (ITC)
				</h2>
				<table className="w-full border-collapse border border-gray-300">
					<tbody>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100 w-1/3">Credit Score</td>
							<td className="p-2 w-2/3">
								{itcData.creditScore} ({itcData.scoreBand})
							</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Civil Judgements</td>
							<td className="p-2">{itcData.judgements}</td>
						</tr>
						<tr className="border-b border-gray-300">
							<td className="p-2 font-bold bg-gray-100">Payment Defaults</td>
							<td className="p-2">
								{itcData.defaults} ({itcData.defaultDetails})
							</td>
						</tr>
						<tr>
							<td className="p-2 font-bold bg-gray-100">Trade References</td>
							<td className="p-2">{itcData.tradeReferences}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div className="mb-8">
				<h2 className="text-lg font-bold uppercase border-b border-gray-300 pb-1 mb-3">
					4. Sanctions, PEP & Adverse Media (WorldCheck)
				</h2>
				<p className="mb-2">
					<span className="font-bold">Global Sanctions Match:</span>{" "}
					{sanctionsData.sanctionsMatch}
				</p>
				<p className="mb-2">
					<span className="font-bold">Politically Exposed Persons (PEP) Hits:</span>{" "}
					{sanctionsData.pepHits}
				</p>

				{sanctionsData.alerts.length > 0 && (
					<div className="mt-4">
						<h3 className="font-bold mb-2">4.1 Adverse Media & Alerts Log</h3>
						<table className="w-full border-collapse border border-gray-300">
							<thead className="bg-gray-100">
								<tr>
									<th className="border border-gray-300 p-2 text-left">Date</th>
									<th className="border border-gray-300 p-2 text-left">Source</th>
									<th className="border border-gray-300 p-2 text-left">Detail</th>
									<th className="border border-gray-300 p-2 text-center">Severity</th>
								</tr>
							</thead>
							<tbody>
								{sanctionsData.alerts.map((alert, idx) => (
									<tr key={idx}>
										<td className="border border-gray-300 p-2 whitespace-nowrap">
											{alert.date}
										</td>
										<td className="border border-gray-300 p-2">{alert.source}</td>
										<td className="border border-gray-300 p-2">{alert.title}</td>
										<td className="border border-gray-300 p-2 text-center font-bold">
											{alert.severity}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<div className="mb-8">
				<h2 className="text-lg font-bold uppercase border-b border-gray-300 pb-1 mb-3">
					5. FICA / KYC Validations
				</h2>
				<div className="grid grid-cols-2 gap-6">
					<div>
						<h3 className="font-bold mb-2 border-b border-gray-200 pb-1">
							5.1 Natural Person Verification
						</h3>
						{ficaData.identity.map((id, idx) => (
							<div key={idx} className="mb-2">
								<p className="font-bold">
									{id.name} ({id.id})
								</p>
								<p className="text-xs">
									HANIS Status: {id.status} | Life Status: {id.deceasedStatus}
								</p>
							</div>
						))}
					</div>
					<div>
						<h3 className="font-bold mb-2 border-b border-gray-200 pb-1">
							5.2 Proof of Residence
						</h3>
						<p className="text-sm font-bold">{ficaData.residence.address}</p>
						<p className="text-xs mt-1">Source: {ficaData.residence.documentType}</p>
						<p className="text-xs">
							Document Age: {ficaData.residence.ageInDays} Days (
							{ficaData.residence.status})
						</p>
					</div>
				</div>

				<div className="mt-4">
					<h3 className="font-bold mb-2 border-b border-gray-200 pb-1">
						5.3 Banking Verification (AVS)
					</h3>
					<p className="text-sm">
						<span className="font-bold">Account:</span> {ficaData.banking.bankName}{" "}
						{ficaData.banking.accountNumber}
					</p>
					<p className="text-sm">
						<span className="font-bold">AVS Match:</span> {ficaData.banking.avsStatus} -{" "}
						{ficaData.banking.avsDetails}
					</p>
				</div>
			</div>

			<div className="mt-12 pt-4 border-t-2 border-black text-center text-xs text-gray-500">
				<p>
					This report was automatically generated by the Compliance Orchestrator System.
				</p>
				<p>
					Data provided by LexisNexis, TransUnion, and the Department of Home Affairs
					(HANIS).
				</p>
				<p className="mt-2 font-bold uppercase">End of Report</p>
			</div>
		</div>
	);
};

// --- Main App Component ---

function RiskReviewDetail({ data }: { data: RiskReviewData }) {
	const [primaryTab, setPrimaryTab] = useState("procurement");
	const [activeSubTab, setActiveSubTab] = useState("overview");

	// AI Feature States
	const [aiSummary, setAiSummary] = useState<string | null>(null);
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);

	const [mediaAnalyses, setMediaAnalyses] = useState<Record<number, string>>({});
	const [analyzingMediaId, setAnalyzingMediaId] = useState<number | null>(null);

	if (!data?.globalData) {
		return (
			<div className="p-8 text-center text-muted-foreground">Loading risk data...</div>
		);
	}

	const { globalData, procurementData, itcData, sanctionsData, ficaData } = data;

	const handlePrint = () => {
		window.print();
	};

	const _handleGenerateSummary = async () => {
		setIsGeneratingSummary(true);
		setSummaryError(null);

		const dataContext = `
      Entity: ${JSON.stringify(globalData.entity)}
      Overall Score: ${globalData.overallRiskScore}
      Procurement Data: ${JSON.stringify(procurementData)}
      ITC Data: ${JSON.stringify(itcData)}
      Sanctions Data: ${JSON.stringify(sanctionsData)}
      FICA Data: ${JSON.stringify(ficaData)}
    `;

		try {
			const result = await generateRiskBriefing(dataContext);
			setAiSummary(result);
		} catch (error) {
			const err = error as Error;
			setSummaryError(err.message || "Failed to generate AI insights. Please try again.");
		} finally {
			setIsGeneratingSummary(false);
		}
	};

	const _handleAnalyzeMedia = async (
		alertIdx: number,
		alert: { title: string; source: string; severity: string }
	) => {
		setAnalyzingMediaId(alertIdx);

		try {
			const result = await analyzeMediaRisk(alert.title, alert.source, alert.severity);
			setMediaAnalyses(prev => ({ ...prev, [alertIdx]: result }));
		} catch (_err) {
			setMediaAnalyses(prev => ({ ...prev, [alertIdx]: "Analysis failed to load." }));
		} finally {
			setAnalyzingMediaId(null);
		}
	};

	const tabs = [
		{ id: "procurement", label: "Procurement", subtitle: "Compliance & Conflicts" },
		{ id: "itc", label: "ITC Credit", subtitle: "Commercial & Defaults" },
		{ id: "sanctions", label: "Sanctions & AML", subtitle: "WorldCheck & Media" },
		{ id: "fica", label: "FICA / KYC", subtitle: "Identity & Banking" },
	];

	return (
		<>
			{/* Screen UI */}
			<div className="min-h-screen card-form text-foreground font-sans p-4 md:p-8 selection:bg-primary/30 print:hidden">
				<div className="max-w-6xl mx-auto space-y-6">
					<header className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-border">
						<div>
							<div className="flex items-center gap-3 mb-2">
								<h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary via-primary to-primary">
									Overall Risk Profile
								</h1>
								{globalData.overallStatus === "REVIEW REQUIRED" && (
									<Badge variant="warning">Manual Review Required</Badge>
								)}
							</div>
							<p className="text-muted-foreground text-sm flex items-center gap-2">
								<FileText className="w-4 h-4" />
								Report Ref: {globalData.transactionId}{" "}
								<span className="text-muted-foreground/60">|</span>
								Generated: {globalData.generatedAt}
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<Button
								variant="ai"
								size="ai"
								className="aiBtn text-violet-400"
								onClick={_handleGenerateSummary}
								disabled={isGeneratingSummary}>
								{isGeneratingSummary ? (
									<Loader2 className="w-8 h-8 animate-spin" />
								) : (
									<RiAiGenerate2 className="text-purple-500 animate-pulse  " />
								)}

								{isGeneratingSummary ? "Analyzing..." : " Brief"}
							</Button>
							<Button variant="default" onClick={handlePrint}>
								<Download className="w-4 h-4" /> Export Master PDF
							</Button>
							<Button
								variant="link"
								className="px-5 py-2 transition-all flex items-center gap-2">
								<Check className="w-4 h-4" /> Final Adjudication
							</Button>
						</div>
					</header>

					{/* AI Executive Summary Card */}
					{(isGeneratingSummary || aiSummary || summaryError) && (
						<div className="animate-in fade-in slide-in-from-top-4 duration-500">
							<div className="relative p-1 rounded-xl bg-linear-to-r from-violet-400/10 via-indigo-700/20 to-purple-900/05 bg-size-[200%_auto] animate-gradient-x border-teal-900">
								<div className="bg-linear-to-r from-cyan-950/10  to-purple-950/20 rounded-lg p-8 h-full border border-cyan-800">
									<div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/05">
										<Sparkles className="w-5 h-5 text-primary" />
										<h2 className="text-lg font-semibold text-foreground">
											AI Adjudication Briefing
										</h2>
										<Badge variant="ai">Beta</Badge>
									</div>

									{isGeneratingSummary && (
										<div className="flex flex-col items-center justify-center py-8 gap-3 text-muted">
											<Loader2 className="w-8 h-8 animate-spin text-primary" />
											<p className="animate-pulse">
												Synthesizing compliance data from 4 domains...
											</p>
										</div>
									)}

									{summaryError && (
										<p className="text-destructive text-sm">{summaryError}</p>
									)}

									{aiSummary && !isGeneratingSummary && (
										<div className="text-xs text-chart-1 whitespace-pre-wrap leading-relaxed">
											{aiSummary}
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Global Summary Row */}
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
										Reg: {globalData.entity.registrationNumber} •{" "}
										{globalData.entity.entityType}
									</p>
								</div>
							</div>
							<div className="flex gap-2">
								<Badge variant="gold">B-BBEE Lvl 2</Badge>
								<Badge variant="danger">1 Conflict Found</Badge>
								<Badge variant="warning">Adverse Media Found</Badge>
								<Badge variant="success">FICA Compliant</Badge>
							</div>
						</Card>

						<Card className="col-span-1 p-6 relative overflow-hidden flex flex-col items-center justify-center">
							<div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
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

					{/* Primary Navigation (Pills) */}
					<div className="flex flex-wrap gap-4 py-2">
						{tabs.map(tab => (
							<Button
								key={tab.id}
								onClick={() => setPrimaryTab(tab.id)}
								className={`flex flex-col items-start px-5 py-8 rounded-md border transition-all ${
									primaryTab === tab.id
										? "bg-secondary border-primary/50 shadow-md shadow-primary/5"
										: "bg-card/30 border-border hover:bg-secondary/50 hover:border-border"
								}`}>
								<span
									className={`text-sm font-semibold pb-1 leading-2.5 ${primaryTab === tab.id ? "text-primary" : "text-foreground"}`}>
									{tab.label}
								</span>
								<span className="text-xs py-0 leading-1.5 text-muted-foreground">
									{tab.subtitle}
								</span>
							</Button>
						))}
					</div>

					{/* Dynamic Content Area */}
					<div className="mt-6">
						{/* PROCUREMENT VIEW */}
						{primaryTab === "procurement" && (
							<div className="space-y-6 animate-in fade-in duration-500">
								{procurementData.riskAlerts.length > 0 && (
									<div className="space-y-3">
										<h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
											<ShieldAlert className="w-5 h-5 text-warning-foreground" />
											Procurement Exceptions
										</h3>
										<div className="grid grid-cols-1 gap-3">
											{procurementData.riskAlerts.map((alert, idx) => (
												<div
													key={idx}
													className="p-4 rounded-lg border bg-warning/10 border-warning/20 flex flex-col md:flex-row md:items-center gap-4">
													<div className="p-2 rounded-full bg-warning/20 text-warning-foreground">
														<AlertTriangle className="w-5 h-5" />
													</div>
													<div className="flex-1">
														<div className="flex items-center gap-2 mb-1">
															<Badge variant="warning">
																{alert.id} | {alert.category}
															</Badge>
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
										{["overview", "directors", "compliance"].map(tab => (
											<Button
												key={tab}
												onClick={() => setActiveSubTab(tab)}
												className={`pb-4 text-sm font-medium capitalize transition-colors relative rounded-b-none ${
													activeSubTab === tab
														? "text-primary bg-secondary"
														: "text-muted-foreground  bg-secondary/50 hover:text-foreground"
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
													{procurementData.checks.map((check, idx) => (
														<tr key={idx} className="hover:bg-muted/20 transition-colors">
															<td className="p-4 font-medium text-foreground">
																{check.name}
															</td>
															<td className="p-4">
																<Badge
																	variant={
																		check.status === "PASS" ? "success" : "danger"
																	}>
																	{check.status}
																</Badge>
															</td>
															<td className="p-4 text-muted-foreground">
																{check.detail}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</Card>
									)}
									{activeSubTab === "directors" && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{procurementData.directors.map((director, idx) => (
												<Card
													key={idx}
													className={`p-5 flex flex-col gap-4 ${director.status === "FLAGGED" ? "border-warning/30" : ""}`}>
													<div className="flex items-start justify-between">
														<div className="flex items-center gap-3">
															<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
																<Users className="w-5 h-5" />
															</div>
															<div>
																<h4 className="font-medium text-foreground">
																	{director.name}
																</h4>
																<p className="text-xs text-muted-foreground">
																	ID: {director.idNumber}
																</p>
															</div>
														</div>
														<Badge
															variant={
																director.status === "CLEARED" ? "success" : "warning"
															}>
															{director.status}
														</Badge>
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
																className={`font-medium ${director.conflicts > 0 ? "text-warning-foreground" : "text-chart-4"}`}>
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
													<h4 className="text-foreground font-medium">
														B-BBEE Expiry Tracking
													</h4>
													<p className="text-sm text-muted-foreground">
														Certificate/Affidavit valid until {procurementData.beeExpiry}
													</p>
												</div>
												<Badge variant="warning">Expires in 24 Days</Badge>
											</div>
										</Card>
									)}
								</div>
							</div>
						)}

						{/* ITC VIEW */}
						{primaryTab === "itc" && (
							<div className="space-y-6 animate-in fade-in duration-500">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
									<Card className="col-span-1 p-6 flex flex-col items-center justify-center bg-muted/30">
										<ScoreGauge
											score={itcData.creditScore}
											label="Commercial Credit Score"
											max={999}
											inverse={true}
										/>
										<p className="text-sm text-primary font-medium mt-2">
											{itcData.scoreBand}
										</p>
									</Card>
									<div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
										<Card className="p-5 border-l-4 border-l-chart-4">
											<div className="flex items-center gap-3 mb-2">
												<Scale className="w-5 h-5 text-chart-4" />
												<h4 className="font-medium text-foreground">Court Judgements</h4>
											</div>
											<p className="text-2xl font-bold text-foreground">
												{itcData.judgements}
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												No active civil judgements recorded.
											</p>
										</Card>
										<Card className="p-5 border-l-4 border-l-warning">
											<div className="flex items-center gap-3 mb-2">
												<AlertOctagon className="w-5 h-5 text-warning-foreground" />
												<h4 className="font-medium text-foreground">Payment Defaults</h4>
											</div>
											<p className="text-2xl font-bold text-foreground">
												{itcData.defaults}
											</p>
											<p className="text-xs text-warning-foreground/80 mt-1">
												{itcData.defaultDetails}
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
														{itcData.tradeReferences}
													</span>
												</div>
												<div className="p-3 bg-muted/30 rounded-lg">
													<span className="block text-xs text-muted-foreground mb-1">
														Recent Credit Enquiries
													</span>
													<span className="text-sm font-medium text-foreground">
														{itcData.recentEnquiries}
													</span>
												</div>
											</div>
										</Card>
									</div>
								</div>
							</div>
						)}

						{/* SANCTIONS VIEW */}
						{primaryTab === "sanctions" && (
							<div className="space-y-6 animate-in fade-in duration-500">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
									<Card className="p-5 flex items-center justify-between">
										<div>
											<p className="text-sm text-muted-foreground mb-1">
												Global Sanctions
											</p>
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
												{sanctionsData.adverseMedia} Hits
											</p>
										</div>
										<div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
											<Newspaper className="w-5 h-5 text-warning-foreground" />
										</div>
									</Card>
								</div>
								<Card>
									<div className="p-5 border-b border-border bg-muted/30">
										<h3 className="font-medium text-foreground flex items-center gap-2">
											<Globe2 className="w-4 h-4 text-primary" />
											WorldCheck / AML Alerts
										</h3>
									</div>
									<div className="divide-y divide-border">
										{sanctionsData.alerts.map((alert, idx) => (
											<div key={idx} className="p-5 hover:bg-muted/20 transition-colors">
												<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
													<div className="flex items-start gap-4">
														<Badge
															variant={alert.severity === "HIGH" ? "danger" : "warning"}>
															{alert.severity}
														</Badge>
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
														{/* AI Action Button for specific alert */}
														<Button
															onClick={() => _handleAnalyzeMedia(idx, alert)}
															disabled={analyzingMediaId === idx}
															className="text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 	 hover:bg-primary/20 transition-colors flex items-center gap-1 disabled:opacity-50">
															{analyzingMediaId === idx ? (
																<Loader2 className="w-3 h-3 animate-spin" />
															) : (
																<Sparkles className="w-3 h-3" />
															)}
															✨ Analyze Risk
														</Button>
														<Button className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 px-2">
															Dossier <ChevronRight className="w-3 h-3" />
														</Button>
													</div>
												</div>

												{/* Expandable AI Analysis Result */}
												{mediaAnalyses[idx] && (
													<div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md text-sm text-foreground animate-in slide-in-from-top-2">
														<p className="flex items-center gap-2 mb-1 font-medium text-primary">
															<Sparkles className="w-4 h-4" /> AI Context Analysis
														</p>
														<p>{mediaAnalyses[idx]}</p>
													</div>
												)}
											</div>
										))}
									</div>
								</Card>
							</div>
						)}

						{/* FICA VIEW */}
						{primaryTab === "fica" && (
							<div className="space-y-6 animate-in fade-in duration-500">
								<div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
									<div className="flex items-center gap-3">
										<FileCheck className="w-5 h-5 text-chart-4" />
										<h3 className="font-medium text-foreground">
											KYC / FICA Verification
										</h3>
									</div>
									<p className="text-xs text-muted-foreground">
										Last verified: {ficaData.lastVerified}
									</p>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<Card className="p-6 md:col-span-2">
										<div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
											<div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
												<Fingerprint className="w-5 h-5 text-muted-foreground" />
											</div>
											<div>
												<h4 className="font-medium text-foreground">
													Identity Document Validity
												</h4>
												<p className="text-xs text-muted-foreground">
													Validated against Department of Home Affairs (HANIS)
												</p>
											</div>
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											{ficaData.identity.map((person, idx) => (
												<div
													key={idx}
													className="p-4 bg-muted/20 rounded-lg border border-border/50">
													<div className="flex items-start justify-between mb-3">
														<div>
															<p className="font-medium text-foreground">{person.name}</p>
															<p className="text-xs text-muted-foreground">{person.id}</p>
														</div>
														<Badge
															variant={
																person.status === "VERIFIED" ? "success" : "warning"
															}>
															{person.status}
														</Badge>
													</div>
													<div className="flex items-center gap-2 text-xs text-chart-4 bg-chart-4/10 px-2 py-1 rounded w-fit">
														<CheckCircle2 className="w-3 h-3" /> Status:{" "}
														{person.deceasedStatus}
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
												<h4 className="font-medium text-foreground">
													Proof of Residence
												</h4>
												<p className="text-xs text-muted-foreground">
													FICA 90-day validity check
												</p>
											</div>
										</div>
										<div className="space-y-4">
											<div>
												<p className="text-xs text-muted-foreground mb-1">
													Declared Address
												</p>
												<p className="text-sm text-foreground font-medium">
													{ficaData.residence.address}
												</p>
											</div>
											<div className="grid grid-cols-2 gap-3 pt-2">
												<div>
													<p className="text-xs text-muted-foreground mb-1">
														Document Used
													</p>
													<p className="text-sm text-foreground">
														{ficaData.residence.documentType}
													</p>
												</div>
												<div>
													<p className="text-xs text-muted-foreground mb-1">
														Document Age
													</p>
													<div className="flex items-center gap-2">
														<p className="text-sm font-medium text-chart-4">
															{ficaData.residence.ageInDays} Days Old
														</p>
														<Badge variant="success">{ficaData.residence.status}</Badge>
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
												<h4 className="font-medium text-foreground">
													Bank & Source of Funds
												</h4>
												<p className="text-xs text-muted-foreground">
													Account Verification System (AVS) & Statements
												</p>
											</div>
										</div>
										<div className="space-y-4">
											<div>
												<p className="text-xs text-muted-foreground mb-1">
													Verified Account
												</p>
												<p className="text-sm text-foreground font-medium">
													{ficaData.banking.bankName} • {ficaData.banking.accountNumber}
												</p>
											</div>
											<div className="p-3 bg-muted/20 rounded-lg border border-border/50">
												<div className="flex items-center justify-between mb-2">
													<span className="text-xs text-muted-foreground">
														Bank AVS Response
													</span>
													<Badge variant="success">{ficaData.banking.avsStatus}</Badge>
												</div>
												<p className="text-xs text-muted-foreground">
													{ficaData.banking.avsDetails}
												</p>
											</div>
										</div>
									</Card>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Printable Report (Receives AI Summary */}
			<div className="hidden">
				<PrintableAuditReport aiSummary={aiSummary} data={data} />
			</div>
			{/* Printable Report (Receives AI Summary */}
			<div className="hidden">
				<PrintableAuditReport aiSummary={aiSummary} data={data} />
			</div>
		</>
	);
}
export { RiskReviewDetail };
