"use client";

import {
	RiAi,
	RiBuildingLine,
	RiCheckLine,
	RiCloseLine,
	RiDownloadLine,
	RiEditLine,
	RiFileTextLine,
	RiHashtag,
	RiLoader4Line,
	RiMailLine,
	RiMoneyDollarCircleLine,
	RiPencilLine,
	RiPhoneLine,
	RiSave3Line,
	RiShieldCheckLine,
	RiUploadCloud2Line,
} from "@remixicon/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardLayout, GlassCard } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RiskBadge, StageBadge, StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { retryFacilitySubmission } from "@/lib/actions/workflow.actions";

interface ApplicantDetail {
	id: number;
	companyName: string;
	tradingName?: string | null;
	registrationNumber?: string | null;
	contactName: string;
	email: string;
	phone?: string | null;
	industry?: string | null;
	mandateType?: string | null;
	mandateVolume?: number | null;
	status: string;
	riskLevel?: string | null;
	itcScore?: number | null;
	sanctionStatus?: "clear" | "flagged" | "confirmed_hit" | null;
	accountExecutive?: string | null;
	createdAt?: string | number | Date | null;
}

interface ApplicantDocument {
	id: number;
	type: string;
	fileName?: string | null;
	status: string;
	uploadedAt?: string | number | Date | null;
	storageUrl?: string | null;
}

interface ApplicantFormSubmission {
	id: number;
	formType: string;
	data?: string | null;
	submittedAt?: string | number | Date | null;
	submittedBy?: string | null;
}

interface ApplicantFormInstance {
	id: number;
	formType: string;
	status: string;
	submittedAt?: string | number | Date | null;
	token?: string | null;
}

interface RiskAssessment {
	id: number;
	overallRisk?: string | null;
	cashFlowConsistency?: string | null;
	dishonouredPayments?: number | null;
	averageDailyBalance?: number | null;
	accountMatchVerified?: string | null;
	letterheadVerified?: string | null;
	aiAnalysis?: string | null;
	reviewedBy?: string | null;
	reviewedAt?: string | number | Date | null;
	notes?: string | null;
}

interface Quote {
	id: number;
	amount: number;
	baseFeePercent: number;
	adjustedFeePercent?: number | null;
	details?: string | null;
	rationale?: string | null;
	status: string;
	generatedBy: string;
	createdAt?: string | number | Date | null;
}

interface Workflow {
	id: number;
	stage?: number | null;
	status?: string | null;
	salesEvaluationStatus?: string | null;
	salesIssuesSummary?: string | null;
	issueFlaggedBy?: string | null;
	preRiskRequired?: number | boolean | null;
	preRiskOutcome?: string | null;
	applicantDecisionOutcome?: string | null;
	applicantDeclineReason?: string | null;
}

interface SanctionsCheckSnapshot {
	source: string;
	reused: boolean;
	checkedAt: string | null;
	riskLevel: string | null;
	isBlocked: boolean | null;
}

const formatDate = (value?: string | number | Date | null) => {
	if (!value) return "-";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
};

const formatDateTime = (value?: string | number | Date | null) => {
	if (!value) return "-";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export default function ApplicantDetailPage() {
	const params = useParams();
	const searchParams = useSearchParams();
	const _router = useRouter();
	const id = params.id as string;
	const defaultTab = searchParams.get("tab") || "overview";
	const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
	const [documents, setDocuments] = useState<ApplicantDocument[]>([]);
	const [applicantSubmissions, setApplicantSubmissions] = useState<
		ApplicantFormSubmission[]
	>([]);
	const [applicantMagiclinkForms, setApplicantMagiclinkForms] = useState<
		ApplicantFormInstance[]
	>([]);
	const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
	const [quote, setQuote] = useState<Quote | null>(null);
	// Workflow instance for actions
	const [workflow, setWorkflow] = useState<Workflow | null>(null);
	const [sanctionsCheck, setSanctionsCheck] = useState<SanctionsCheckSnapshot | null>(null);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [copiedFormId, setCopiedFormId] = useState<number | null>(null);
	const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);

	// Quote editing state
	const [isEditingQuote, setIsEditingQuote] = useState(false);
	const [editAmount, setEditAmount] = useState("");
	const [editBaseFee, setEditBaseFee] = useState("");
	const [editAdjustedFee, setEditAdjustedFee] = useState("");
	const [quoteActionLoading, setQuoteActionLoading] = useState<string | null>(null);
	const [quoteMessage, setQuoteMessage] = useState<string | null>(null);

	// Initialize edit values when quote loads or edit mode is enabled
	useEffect(() => {
		if (quote && isEditingQuote) {
			setEditAmount(String(quote.amount));
			setEditBaseFee(String(quote.baseFeePercent));
			setEditAdjustedFee(String(quote.adjustedFeePercent || ""));
		}
	}, [quote, isEditingQuote]);

	const canEditQuote =
		quote && !["pending_signature", "approved", "rejected"].includes(quote.status);
	const isPreRiskCleared =
		!workflow?.preRiskRequired || workflow.preRiskOutcome === "approved";

	const handleSaveQuoteDraft = async () => {
		if (!quote) return;
		setQuoteActionLoading("draft");
		setQuoteMessage(null);
		try {
			const response = await fetch(`/api/quotes/${quote.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: Number(editAmount),
					baseFeePercent: Number(editBaseFee),
					adjustedFeePercent: editAdjustedFee ? Number(editAdjustedFee) : null,
				}),
			});
			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to save quote");
			}
			const data = await response.json();
			setQuote(data.quote);
			setQuoteMessage("Quote saved as draft.");
			setIsEditingQuote(false);
		} catch (err) {
			setQuoteMessage(err instanceof Error ? err.message : "Save failed");
		} finally {
			setQuoteActionLoading(null);
		}
	};

	const handleSaveAndApprove = async () => {
		if (!quote) return;
		if (!isPreRiskCleared) {
			setQuoteMessage("Pre-risk clearance is still pending.");
			return;
		}
		setQuoteActionLoading("approve");
		setQuoteMessage(null);
		try {
			// First save the quote
			const updateResponse = await fetch(`/api/quotes/${quote.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: Number(editAmount),
					baseFeePercent: Number(editBaseFee),
					adjustedFeePercent: editAdjustedFee ? Number(editAdjustedFee) : null,
				}),
			});
			if (!updateResponse.ok) {
				const payload = await updateResponse.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to save quote");
			}
			// Then approve
			const approveResponse = await fetch(`/api/quotes/${quote.id}/approve`, {
				method: "POST",
			});
			if (!approveResponse.ok) {
				const payload = await approveResponse.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to approve quote");
			}
			const approveData = await approveResponse.json();
			setQuote(approveData.quote);
			setQuoteMessage("Quote approved and sent to client.");
			setIsEditingQuote(false);
		} catch (err) {
			setQuoteMessage(err instanceof Error ? err.message : "Approval failed");
		} finally {
			setQuoteActionLoading(null);
		}
	};

	const handleDeclineQuote = async () => {
		if (!quote) return;
		if (
			!window.confirm(
				"Are you sure you want to decline this quote? This action cannot be undone."
			)
		) {
			return;
		}
		setQuoteActionLoading("decline");
		setQuoteMessage(null);
		try {
			const response = await fetch(`/api/quotes/${quote.id}/reject`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reason: "Declined by manager" }),
			});
			if (!response.ok) {
				const payload = await response.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to decline quote");
			}
			setQuote({ ...quote, status: "rejected" });
			setQuoteMessage("Quote has been declined.");
			setIsEditingQuote(false);
		} catch (err) {
			setQuoteMessage(err instanceof Error ? err.message : "Decline failed");
		} finally {
			setQuoteActionLoading(null);
		}
	};

	const handleApproveQuote = async () => {
		if (!quote) return;
		if (!isPreRiskCleared) {
			setQuoteMessage("Pre-risk clearance is still pending.");
			return;
		}
		setQuoteActionLoading("approve");
		setQuoteMessage(null);
		try {
			const approveResponse = await fetch(`/api/quotes/${quote.id}/approve`, {
				method: "POST",
			});
			if (!approveResponse.ok) {
				const payload = await approveResponse.json().catch(() => ({}));
				throw new Error(payload?.error || "Failed to approve quote");
			}
			const approveData = await approveResponse.json();
			setQuote(approveData.quote);
			setQuoteMessage("Quote approved and sent to client.");
		} catch (err) {
			setQuoteMessage(err instanceof Error ? err.message : "Approval failed");
		} finally {
			setQuoteActionLoading(null);
		}
	};

	const handleCopyMagicLink = async (instance: ApplicantFormInstance) => {
		if (!instance.token) return;

		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			(typeof window !== "undefined" ? window.location.origin : "");
		const path =
			instance.formType === "DOCUMENT_UPLOADS"
				? `/uploads/${instance.token}`
				: `/forms/${instance.token}`;
		const url = `${baseUrl}${path}`;

		try {
			if (!navigator?.clipboard) {
				window.prompt("Copy magic link", url);
				return;
			}

			await navigator.clipboard.writeText(url);
			setCopiedFormId(instance.id);
			setTimeout(() => setCopiedFormId(null), 2000);
		} catch (copyError) {
			console.error("Failed to copy magic link:", copyError);
			window.prompt("Copy magic link", url);
		}
	};

	const handleRetrySubmission = async () => {
		if (!workflow?.id) return;

		if (
			!window.confirm(
				"Are you sure you want to retry the facility submission event? This should only be done if the workflow is stuck."
			)
		) {
			return;
		}

		setActionLoading(true);
		try {
			const result = await retryFacilitySubmission(workflow.id);
			if (result.success) {
				alert(`Success: ${result.message}`);
				// Optional: reload the page or re-fetch data
				window.location.reload();
			} else {
				alert(`Error: ${result.error}`);
			}
		} catch (e) {
			console.error(e);
			alert("Failed to retry submission due to an unexpected error.");
		} finally {
			setActionLoading(false);
		}
	};

	const handleDownloadDocument = (doc: ApplicantDocument) => {
		if (doc.storageUrl) {
			window.open(doc.storageUrl, "_blank");
		}
	};

	useEffect(() => {
		let mounted = true;
		const fetchApplicant = async () => {
			try {
				const response = await fetch(`/api/applicants/${id}`);
				if (!response.ok) {
					throw new Error("Failed to fetch applicant");
				}
				const data = await response.json();
				if (!mounted) return;
				setApplicant(data.applicant);
				setDocuments(data.documents || []);
				setApplicantSubmissions(data.applicantSubmissions || []);
				setApplicantMagiclinkForms(data.applicantMagiclinkForms || []);
				setRiskAssessment(data.riskAssessment || null);
				setQuote(data.quote || null);
				setWorkflow(data.workflow || null);
				setSanctionsCheck(data.sanctionsCheck || null);
			} catch (err) {
				if (!mounted) return;
				setError(err instanceof Error ? err.message : "Failed to load applicant");
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		fetchApplicant();
		return () => {
			mounted = false;
		};
	}, [id]);

	if (loading) {
		return (
			<DashboardLayout title="Loading..." description="Fetching applicant details">
				<p className="text-sm text-muted-foreground">Loading applicant details...</p>
			</DashboardLayout>
		);
	}

	if (error || !applicant) {
		return (
			<DashboardLayout title="Applicant not found" description="Unable to load applicant">
				<p className="text-sm text-destructive">{error || "Applicant not found"}</p>
			</DashboardLayout>
		);
	}

	const client = applicant;

	return (
		<DashboardLayout
			title={client.companyName}
			description={`Registration: ${client.registrationNumber || "N/A"}`}
			actions={
				<div className="flex gap-2">
					<Button variant="outline" size="sm">
						Edit Details
					</Button>
					<Button
						size="sm"
						className="bg-action hover:bg-action/85"
						onClick={handleRetrySubmission}
						disabled={actionLoading || !workflow}>
						{actionLoading ? "Retrying..." : "Retry Facility Submission"}
					</Button>
				</div>
			}>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Sidebar: Quick Stats & status */}
				<div className="space-y-6">
					<GlassCard className="space-y-6">
						<div>
							<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Current Stage
							</span>
							<div className="mt-2">
								<StageBadge stage={client.status} />
							</div>
						</div>

						<div>
							<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Risk Profile
							</span>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<RiskBadge level={client.riskLevel || "unknown"} />
								{client.itcScore !== null && client.itcScore !== undefined ? (
									<span
										className={`text-sm font-bold ${
											client.itcScore < 60
												? "text-destructive-foreground"
												: "text-emerald-900"
										}`}>
										ITC: {client.itcScore}
									</span>
								) : null}
								<Badge
									variant="outline"
									className={
										client.sanctionStatus === "flagged" ||
										client.sanctionStatus === "confirmed_hit"
											? "text-red-500 border-red-500"
											: "text-emerald-700 border-emerald-500/40"
									}>
									Sanctions: {client.sanctionStatus || "clear"}
								</Badge>
							</div>
							{sanctionsCheck?.checkedAt ? (
								<p className="text-xs text-muted-foreground mt-2">
									Last sanctions run: {formatDateTime(sanctionsCheck.checkedAt)} (
									{sanctionsCheck.source.replace(/_/g, " ").toLowerCase()}
									{sanctionsCheck.reused ? ", reused" : ""})
								</p>
							) : null}
						</div>

						<Separator className="bg-border/50" />

						<div className="space-y-3">
							<div className="flex items-center gap-3 text-sm">
								<RiHashtag className="h-4 w-4 text-muted-foreground" />
								<span className="font-mono text-muted-foreground">
									{client.registrationNumber || "N/A"}
								</span>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<RiBuildingLine className="h-4 w-4 text-muted-foreground" />
								<span>{client.industry || "Not specified"}</span>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<RiShieldCheckLine className="h-4 w-4 text-muted-foreground" />
								<span className="capitalize">
									{client.mandateType
										? client.mandateType.replace(/_/g, " ").toLowerCase()
										: "Not set"}
								</span>
							</div>
						</div>
					</GlassCard>

					<GlassCard>
						<h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-muted-foreground">
							Primary Contact
						</h3>
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
									{client.contactName.charAt(0)}
								</div>
								<div>
									<p className="font-semibold text-sm">{client.contactName}</p>
									<p className="text-xs text-muted-foreground">Main Signatory</p>
								</div>
							</div>
							<div className="space-y-2 text-sm">
								<div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
									<RiMailLine className="h-4 w-4" />
									{client.email}
								</div>
								<div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
									<RiPhoneLine className="h-4 w-4" />
									{client.phone || "Not provided"}
								</div>
							</div>
						</div>
					</GlassCard>
				</div>

				{/* Main Content Area */}
				<div className="lg:col-span-2">
					<Tabs defaultValue={defaultTab} className="w-full">
						<TabsList className="mb-0 bg-slate-700 w-full justify-start border-b border-border/40 rounded-b-none rounded-t-xl h-auto p-0 gap-2">
							<TabsTrigger
								value="overview"
								className="rounded-b-none border-b-2 border-none outline-0 shadow-none px-4 py-3">
								Overview
							</TabsTrigger>
							<TabsTrigger
								value="documents"
								className="border-b-2 border-none outline-0 shadow-none px-4 py-3">
								Documents & FICA
							</TabsTrigger>
							<TabsTrigger
								value="forms"
								className="border-b-2 border-none outline-0 shadow-none px-4 py-3">
								Forms
							</TabsTrigger>
							<TabsTrigger
								value="risk"
								className="border-b-2 border-none outline-0 shadow-none px-4 py-3">
								Risk Assessment
							</TabsTrigger>
							<TabsTrigger
								value="reviews"
								className="border-b-2 border-none outline-0 shadow-none px-4 py-3">
								Reviews
							</TabsTrigger>
						</TabsList>

						<TabsContent value="overview">
							<GlassCard className="mb-6">
								<h3 className="font-bold text-lg mb-4">Application Summary</h3>
								<p className="text-sm text-muted-foreground mb-6">
									Application initiated on{" "}
									<span className="font-medium text-foreground">
										{formatDate(client.createdAt)}
									</span>{" "}
									by{" "}
									<span className="font-medium text-foreground">
										{client.accountExecutive || "Unassigned"}
									</span>
									. Currently in{" "}
									<span className="font-medium text-foreground">{client.status}</span>{" "}
									stage awaiting next action.
								</p>
								<div className="grid grid-cols-2 gap-4">
									<div className="p-4 rounded-xl bg-action/10 border border-border/50">
										<p className="text-xs uppercase text-muted-foreground font-bold">
											Trading Name
										</p>
										<p className="font-medium mt-1">
											{client.tradingName || "Not provided"}
										</p>
									</div>
									<div className="p-4 rounded-xl bg-action/10 border border-border/50">
										<p className="text-xs uppercase text-muted-foreground font-bold">
											Estimated Vol
										</p>
										<p className="font-medium mt-1">
											R{" "}
											{client.mandateVolume
												? (client.mandateVolume / 100).toLocaleString()
												: "0"}
										</p>
									</div>
								</div>
								{workflow ? (
									<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
										<div className="p-3 rounded-lg bg-secondary/10 border border-border/40">
											<p className="text-xs uppercase text-muted-foreground font-bold">
												Sales Evaluation
											</p>
											<p className="text-sm mt-1">
												{workflow.salesEvaluationStatus || "not_started"}
											</p>
											{workflow.salesIssuesSummary ? (
												<p className="text-xs text-muted-foreground mt-1">
													{workflow.salesIssuesSummary}
												</p>
											) : null}
										</div>
										<div className="p-3 rounded-lg bg-secondary/10 border border-border/40">
											<p className="text-xs uppercase text-muted-foreground font-bold">
												Pre-risk Path
											</p>
											<p className="text-sm mt-1">
												{workflow.preRiskRequired
													? workflow.preRiskOutcome || "required"
													: "not_required"}
											</p>
											{workflow.issueFlaggedBy ? (
												<p className="text-xs text-muted-foreground mt-1">
													Flagged by {workflow.issueFlaggedBy}
												</p>
											) : null}
										</div>
										<div className="p-3 rounded-lg bg-secondary/10 border border-border/40">
											<p className="text-xs uppercase text-muted-foreground font-bold">
												Sanctions Check
											</p>
											<p className="text-sm mt-1">
												{sanctionsCheck?.riskLevel || "pending"}
											</p>
											{sanctionsCheck?.checkedAt ? (
												<p className="text-xs text-muted-foreground mt-1">
													{formatDateTime(sanctionsCheck.checkedAt)} via{" "}
													{sanctionsCheck.source.replace(/_/g, " ").toLowerCase()}
													{sanctionsCheck.reused ? " (reused)" : ""}
												</p>
											) : (
												<p className="text-xs text-muted-foreground mt-1">
													Runs during pre-risk (if flagged) or at ITC after FICA.
												</p>
											)}
										</div>
										<div className="p-3 rounded-lg bg-secondary/10 border border-border/40 md:col-span-2">
											<p className="text-xs uppercase text-muted-foreground font-bold">
												Applicant Decision
											</p>
											<p className="text-sm mt-1">
												{workflow.applicantDecisionOutcome || "pending"}
											</p>
											{workflow.applicantDeclineReason ? (
												<p className="text-xs text-muted-foreground mt-1">
													Reason: {workflow.applicantDeclineReason}
												</p>
											) : null}
										</div>
									</div>
								) : null}
							</GlassCard>
						</TabsContent>

						<TabsContent value="documents">
							<div className="space-y-4">
								<div className="flex justify-between items-center mb-4">
									<h3 className="font-bold text-lg">Required Documents</h3>
									<Button size="sm" variant="outline" className="gap-2">
										<RiUploadCloud2Line className="h-4 w-4" />
										Upload New
									</Button>
								</div>

								{documents.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No documents uploaded yet.
									</p>
								) : (
									documents.map(doc => (
										<div
											key={doc.id}
											className="flex items-center justify-between p-4 rounded-xl border-2 border-b-white bg-card hover:bg-secondary/10 transition-colors">
											<div className="flex items-center gap-4">
												<div className="h-10 w-10 rounded-lg flex items-center justify-center bg-secondary/40 text-secondary-foreground">
													<RiFileTextLine className="h-5 w-5" />
												</div>
												<div>
													<p className="font-medium text-sm">{doc.type}</p>
													<p className="text-xs text-muted-foreground">
														{doc.fileName || "No file uploaded"}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-4">
												<span className="text-xs text-muted-foreground hidden sm:block">
													Uploaded {formatDate(doc.uploadedAt)}
												</span>
												<StatusBadge
													status={
														doc.status === "verified"
															? "success"
															: doc.status === "rejected"
																? "error"
																: "warning"
													}>
													{doc.status}
												</StatusBadge>
												{doc.storageUrl && (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														onClick={() => handleDownloadDocument(doc)}
														title="Download document">
														<RiDownloadLine className="h-4 w-4" />
													</Button>
												)}
											</div>
										</div>
									))
								)}
							</div>
						</TabsContent>

						<TabsContent value="forms">
							<div className="space-y-4">
								<h3 className="font-bold text-lg">Form Submissions</h3>
								{applicantMagiclinkForms.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No form links created yet.
									</p>
								) : (
									<div className="space-y-3">
										{applicantMagiclinkForms.map(instance => {
											const submission = applicantSubmissions.find(
												item => item.formType === instance.formType
											);
											const isExpanded = expandedSubmission === submission?.id;
											let submissionData: Record<string, unknown> | null = null;
											if (submission?.data) {
												try {
													submissionData = JSON.parse(submission.data);
												} catch {
													submissionData = null;
												}
											}

											return (
												<div
													key={instance.id}
													className="rounded-xl border border-border/60 overflow-hidden">
													<div className="flex items-center justify-between p-4 bg-primary/10">
														<div>
															<p className="text-xs uppercase font-bold">
																{instance.formType.replace(/_/g, " ").toLowerCase()}
															</p>
															<p className="text-sm text-success/90 my-1 font-sans italic">
																{instance.status}
															</p>
															{instance.token ? (
																<Button
																	type="button"
																	variant="default"
																	size="xs"
																	className="mt-1 px-2 bg-slate-700/50 text-xs"
																	onClick={() => handleCopyMagicLink(instance)}>
																	{copiedFormId === instance.id
																		? "Copied"
																		: "Copy Client link"}
																</Button>
															) : (
																<p className="mt-1 text-xs text-muted-foreground">
																	Magic link unavailable
																</p>
															)}
														</div>
														<div className="flex items-center gap-3">
															<div className="text-right text-xs text-muted-foreground">
																{submission?.submittedBy
																	? `Submitted by ${submission.submittedBy}`
																	: "Not submitted"}
																<br />
																{formatDate(submission?.submittedAt)}
															</div>
															{submission?.data && (
																<Button
																	variant="secondary"
																	size="xs"
																	onClick={() =>
																		setExpandedSubmission(
																			isExpanded ? null : submission.id
																		)
																	}>
																	{isExpanded ? "Hide Data" : "View Data"}
																</Button>
															)}
														</div>
													</div>
													{isExpanded && submissionData && (
														<div className="border-t border-border/60 bg-secondary/5 p-4">
															<h5 className="text-xs font-bold uppercase text-muted-foreground mb-3">
																Submission Data
															</h5>
															<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
																{Object.entries(submissionData).map(([key, value]) => (
																	<div
																		key={key}
																		className="flex justify-between items-start p-2 rounded-lg bg-card border border-border/40">
																		<span className="text-xs text-muted-foreground capitalize">
																			{key
																				.replace(/([A-Z])/g, " $1")
																				.replace(/_/g, " ")
																				.toLowerCase()}
																		</span>
																		<span className="text-xs font-medium text-foreground text-right max-w-[60%] wrap-break-word capitalize">
																			{typeof value === "string"
																				? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(
																						value
																					)
																					? formatDateTime(value)
																					: value.replace(/_/g, " ").toLowerCase()
																				: String(value)}
																		</span>
																	</div>
																))}
															</div>
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}
							</div>
						</TabsContent>

						<TabsContent value="risk">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
								<GlassCard>
									<h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">
										Financial Health
									</h4>
									{riskAssessment ? (
										<div className="space-y-3">
											<div className="flex justify-between items-center">
												<span className="text-sm text-foreground">
													Cash Flow Consistency
												</span>
												<Badge
													variant="outline"
													className={
														riskAssessment.cashFlowConsistency === "consistent"
															? "text-emerald-500"
															: "text-amber-800"
													}>
													{riskAssessment.cashFlowConsistency || "Pending"}
												</Badge>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-sm text-foreground">
													Dishonoured Payments
												</span>
												<span className="text-sm font-medium">
													{riskAssessment.dishonouredPayments ?? "-"}
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-sm text-foreground">Avg Daily Balance</span>
												<span className="text-sm font-medium">
													{riskAssessment.averageDailyBalance
														? `R ${(riskAssessment.averageDailyBalance / 100).toLocaleString()}`
														: "-"}
												</span>
											</div>
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											AI analysis results will appear once documents are processed.
										</p>
									)}
								</GlassCard>

								<GlassCard>
									<h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">
										Identity Verification
									</h4>
									<div className="space-y-4">
										<div className="flex justify-between items-center">
											<span className="text-sm text-foreground">
												Account Holder Match
											</span>
											<StatusBadge
												status={
													riskAssessment?.accountMatchVerified === "yes"
														? "success"
														: riskAssessment?.accountMatchVerified === "no"
															? "error"
															: "warning"
												}>
												{riskAssessment?.accountMatchVerified || "Pending"}
											</StatusBadge>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-sm text-foreground">
												Letterhead Verification
											</span>
											<StatusBadge
												status={
													riskAssessment?.letterheadVerified === "yes"
														? "success"
														: riskAssessment?.letterheadVerified === "no"
															? "error"
															: "warning"
												}>
												{riskAssessment?.letterheadVerified || "Pending"}
											</StatusBadge>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-sm text-foreground">Overall Risk Level</span>
											{riskAssessment?.overallRisk ? (
												<RiskBadge level={riskAssessment.overallRisk} />
											) : (
												<StatusBadge status="warning">Pending</StatusBadge>
											)}
										</div>
									</div>
								</GlassCard>
							</div>

							<GlassCard
								className={`border-l-4 ${
									riskAssessment?.overallRisk === "red"
										? "border-l-red-500"
										: riskAssessment?.overallRisk === "amber"
											? "border-l-amber-500"
											: riskAssessment?.overallRisk === "green"
												? "border-l-emerald-500"
												: "border-l-blue-500"
								}`}>
								<h4 className="flex items-center gap-2 text-blue-500 font-bold mb-2">
									<RiShieldCheckLine className="h-5 w-5" />
									AI Risk Analysis
								</h4>
								{riskAssessment?.aiAnalysis ? (
									<div className="text-sm leading-relaxed text-muted-foreground">
										{(() => {
											try {
												const analysis = JSON.parse(riskAssessment.aiAnalysis);
												return (
													<div className="space-y-2">
														{Object.entries(analysis).map(([key, value]) => (
															<p key={key}>
																<span className="font-medium capitalize">
																	{key
																		.replace(/([A-Z])/g, " $1")
																		.replace(/_/g, " ")
																		.toLowerCase()}
																	:
																</span>{" "}
																<span className="capitalize">
																	{typeof value === "string"
																		? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(value)
																			? formatDateTime(value)
																			: value.replace(/_/g, " ").toLowerCase()
																		: String(value)}
																</span>
															</p>
														))}
													</div>
												);
											} catch {
												return <p>{riskAssessment.aiAnalysis}</p>;
											}
										})()}
									</div>
								) : (
									<p className="text-sm leading-relaxed text-muted-foreground">
										Risk analysis will populate once AI verification completes.
									</p>
								)}
								{riskAssessment?.reviewedBy && (
									<p className="mt-4 text-xs text-muted-foreground">
										Reviewed by {riskAssessment.reviewedBy} on{" "}
										{formatDate(riskAssessment.reviewedAt)}
									</p>
								)}
							</GlassCard>
						</TabsContent>

						<TabsContent value="reviews">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<h3 className="font-bold text-slate-800/50 text-3xl mt-4 pt-4 pl-4">
										Quote Review
									</h3>
									{quote && canEditQuote && !isEditingQuote && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setIsEditingQuote(true)}
											className="gap-2">
											<RiEditLine className="h-4 w-4" />
											Edit Quote
										</Button>
									)}
								</div>
								{quote ? (
									<GlassCard>
										<div className="flex items-start justify-between mb-6">
											<div className="flex items-center gap-3">
												<div className="h-12 w-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
													<RiMoneyDollarCircleLine className="h-6 w-6" />
												</div>
												<div>
													{isEditingQuote ? (
														<div className="space-y-1">
															<p className="text-xs text-muted-foreground">
																Amount (cents)
															</p>
															<Input
																type="number"
																value={editAmount}
																onChange={e => setEditAmount(e.target.value)}
																className="font-bold text-lg h-8 w-40"
															/>
														</div>
													) : (
														<h4 className="font-black text-2xl text-emerald-900">
															R {(quote.amount / 100).toLocaleString()}
														</h4>
													)}
												</div>
											</div>
											<Badge
												variant="outline"
												className={
													quote.status === "approved"
														? "text-emerald-100 bg-emerald-600/80 border-emerald-500"
														: quote.status === "rejected"
															? "text-red-500 border-red-500"
															: quote.status === "pending_approval"
																? "text-amber-900 bg-amber-600/80 border-amber-500"
																: quote.status === "pending_signature"
																	? "text-blue-600 bg-blue-100 border-blue-500"
																	: "text-muted-foreground"
												}>
												{quote.status === "pending_signature" ? (
													<span className="flex items-center gap-1">
														Pending Signature
													</span>
												) : quote.status === "pending_approval" ? (
													<span className="flex items-center gap-1">
														Pending Approval
													</span>
												) : quote.status === "approved" ? (
													<span className="flex items-center gap-1">
														<RiCheckLine className="h-3 w-3" /> Approved
													</span>
												) : (
													quote.status
												)}
											</Badge>
										</div>

										<Separator className="mb-4" />

										<div className="grid grid-cols-2 gap-4 mb-6">
											<div className="p-3 rounded-lg bg-secondary/10 border border-border/40">
												<p className="text-xs text-muted-foreground mb-1">
													Base Fee (bps)
												</p>
												{isEditingQuote ? (
													<Input
														type="number"
														value={editBaseFee}
														onChange={e => setEditBaseFee(e.target.value)}
														className="font-bold text-lg h-8"
													/>
												) : (
													<p className="font-bold text-lg">
														{(quote.baseFeePercent / 100).toFixed(2)}%
													</p>
												)}
											</div>
											<div className="p-3 rounded-lg bg-secondary/10 border border-border/40">
												<p className="text-xs text-muted-foreground mb-1">
													Adjusted Fee (bps)
												</p>
												{isEditingQuote ? (
													<Input
														type="number"
														value={editAdjustedFee}
														onChange={e => setEditAdjustedFee(e.target.value)}
														className="font-bold text-lg h-8"
														placeholder="Optional"
													/>
												) : (
													<p className="font-bold text-lg">
														{quote.adjustedFeePercent
															? `${(quote.adjustedFeePercent / 100).toFixed(2)}%`
															: "-"}
													</p>
												)}
											</div>
										</div>

										{quote.rationale && (
											<div className="mb-4 border border-border/40 p-4 rounded-lg bg-secondary/5">
												<h5 className="flex items-center gap-1.5 text-xs font-bold uppercase text-violet-800 mb-2">
													<span className="border-3 border-violet-800/40 animate-bounce rounded-xl w-8 h-8 flex items-center justify-center">
														{" "}
														<RiAi
															color="var(--color-violet-600)"
															className="w-4 h-4"
														/>{" "}
													</span>{" "}
													<span className="text-violet-800">Rationale</span>
												</h5>
												<p className="text-sm leading-relaxed font-sans text-muted-foreground">
													{quote.rationale}
												</p>
											</div>
										)}

										{quote.details && (
											<div>
												<div className="text-sm text-muted-foreground">
													{(() => {
														try {
															const details = JSON.parse(quote.details);
															return (
																<div className="grid grid-cols-2 gap-2">
																	{Object.entries(details).map(([key, value]) => (
																		<div
																			key={key}
																			className="flex flex-col p-4 justify-start gap-1 bg-card text-foreground/60 shadow-lg shadow-secondary/10 rounded-lg border border-border/60">
																			<span className="capitalize font-bold">
																				{key
																					.replace(/([A-Z])/g, " $1")
																					.replace(/_/g, " ")
																					.toLowerCase()}
																			</span>
																			<span className="font-medium capitalize font-sans text-muted-foreground/80">
																				{typeof value === "string"
																					? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(
																							value
																						)
																						? formatDateTime(value)
																						: value.replace(/_/g, " ").toLowerCase()
																					: String(value)}
																			</span>
																		</div>
																	))}
																</div>
															);
														} catch {
															return <p>{quote.details}</p>;
														}
													})()}
												</div>
											</div>
										)}

										{/* Action buttons for editing */}
										{isEditingQuote && (
											<>
												<Separator className="my-8" />
												<div className="flex flex-col gap-3">
													{quoteMessage && (
														<p className="text-sm text-amber-600">{quoteMessage}</p>
													)}
													{!isPreRiskCleared && (
														<p className="text-sm text-amber-700">
															Awaiting pre-risk clearance before this quote can be
															approved and sent.
														</p>
													)}
													<div className="flex flex-wrap gap-2">
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																setIsEditingQuote(false);
																setQuoteMessage(null);
															}}
															disabled={quoteActionLoading !== null}>
															Cancel
														</Button>
														<Button
															variant="secondary"
															onClick={handleSaveQuoteDraft}
															disabled={quoteActionLoading !== null}
															className="gap-2">
															{quoteActionLoading === "draft" ? (
																<RiLoader4Line className="h-4 w-4 animate-spin" />
															) : (
																<RiSave3Line className="h-4 w-4" />
															)}
															Save as Draft
														</Button>
														<Button
															variant="secondary"
															onClick={handleSaveAndApprove}
															disabled={quoteActionLoading !== null || !isPreRiskCleared}
															className="gap-2 bg-teal-600 hover:bg-teal-700">
															{quoteActionLoading === "approve" ? (
																<RiLoader4Line className="h-4 w-4 animate-spin" />
															) : (
																<RiCheckLine className="h-4 w-4" />
															)}
															Save & Approve
														</Button>
														<Button
															variant="destructive"
															size="sm"
															onClick={handleDeclineQuote}
															disabled={quoteActionLoading !== null}
															className="gap-2">
															{quoteActionLoading === "decline" ? (
																<RiLoader4Line className="h-4 w-4 animate-spin" />
															) : (
																<RiCloseLine className="h-4 w-4" />
															)}
															Decline
														</Button>
													</div>
												</div>
											</>
										)}

										{/* Show approve/decline buttons when not in edit mode but quote is pending */}
										{!isEditingQuote && canEditQuote && (
											<>
												<Separator className="my-4" />
												<div className="flex flex-col gap-3">
													{quoteMessage && (
														<p className="text-sm text-amber-600">{quoteMessage}</p>
													)}
													{!isPreRiskCleared && (
														<p className="text-sm text-amber-700">
															Awaiting pre-risk clearance before this quote can be
															approved and sent.
														</p>
													)}
													<div className="flex flex-wrap gap-2">
														<Button
															variant="secondary"
															onClick={handleApproveQuote}
															disabled={quoteActionLoading !== null || !isPreRiskCleared}
															className="gap-2 bg-linear-to-b from-teal-600 to-teal-700 rounded-xl h-12.5 outline-0 border-2 border-teal-600 text-shadow-sm text-shadow-teal-950/40  p-4 text-white text-sm shadow-md shadow-teal-950/60 hover:shadow-teal-900/60  hover:opacity-80 hover:border-teal-700 transition-all duration-300">
															{quoteActionLoading === "approve" ? (
																<RiLoader4Line className="h-4 w-4 animate-spin" />
															) : (
																<RiCheckLine className="h-4 w-4" />
															)}
															Approve & Send to Client
														</Button>
														<Button
															variant="destructive"
															onClick={handleDeclineQuote}
															disabled={quoteActionLoading !== null}
															className="gap-2 bg-linear-to-t from-destructive to-destructive/80 rounded-xl h-12  text-shadow-sm text-shadow-red-950/20 hover:shadow-red-900/60  hover:opacity-80 hover:bg-destructive-foreground border-2 shadow-md shadow-red-900/70  border-destructive p-4 text-white text-sm">
															{quoteActionLoading === "decline" ? (
																<RiLoader4Line className="h-4 w-4 animate-spin" />
															) : (
																<RiCloseLine className="h-4 w-4 text-white-500 text-shadow-sm text-shadow-red-950" />
															)}
															Decline
														</Button>
														<Button
															variant="destructive"
															onClick={() => setIsEditingQuote(true)}
															disabled={quoteActionLoading !== null}
															className="gap-2 bg-linear-to-t from-slate-200 to-slate-200/80 rounded-xl h-12 hover:bg-slate-200-foreground border-1 border-slate-900/20 shadow-md shadow-slate-900/20  p-4 text-slate-800/50 text-sm">
															{quoteActionLoading === "decline" ? (
																<RiLoader4Line className="h-4 w-4 animate-spin" />
															) : (
																<RiPencilLine className="h-4 w-4" />
															)}
															Edit Quote
														</Button>
													</div>
												</div>
											</>
										)}
									</GlassCard>
								) : (
									<GlassCard>
										<div className="flex flex-col items-center justify-center py-8 text-center">
											<RiMoneyDollarCircleLine className="h-12 w-12 text-muted-foreground/30 mb-4" />
											<p className="text-sm text-muted-foreground">
												No quote has been generated yet.
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												A quote will be generated once the workflow reaches the
												appropriate stage.
											</p>
										</div>
									</GlassCard>
								)}
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</DashboardLayout>
	);
}
