"use client";

import { RiAlertLine, RiFilter3Line, RiRefreshLine, RiTimeLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout, SearchInput } from "@/components/dashboard";
import { RiskEntitiesTable } from "@/components/dashboard/risk-entities-table";

import { Button } from "@/components/ui/button";
import { getDecisionEndpoint } from "@/lib/utils";

interface OverrideData {
	overrideCategory?: string;
	overrideSubcategory?: string;
	overrideDetails?: string;
}

interface RiskReviewItem {
	id: number;
	applicantId: string;
	decisionType: string;
	targetResource: string;
	reviewType: string;
	stage: string;
	anomalies?: string[];
	procurementCheckFailed?: boolean;
	procurementScore?: number;
	procurementRecommendedAction?: string;
	recommendation?: string;
	procurementFailureReason?: string;
	procurementFailureSource?: string;
	procurementFailureGuidance?: string;
	clientName: string;
	companyName: string;
	aiTrustScore?: number;
	createdAt: string | Date;
}

export default function RiskReviewPage() {
	const [searchTerm, setSearchTerm] = useState("");
	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [_selectedItem, setSelectedItem] = useState(null);
	const [_isDetailOpen, setIsDetailOpen] = useState(false);
	const [showHistory, setShowHistory] = useState(false);

	const isProcurementReview = (item: { reviewType: string }): boolean =>
		item.reviewType === "procurement";

	const normalizeProcurementRecommendation = (
		recommendation?: string
	): "APPROVE" | "MANUAL_REVIEW" | "DECLINE" => {
		const value = recommendation?.toUpperCase();
		if (value === "APPROVE" || value === "APPROVED" || value === "CLEARED") {
			return "APPROVE";
		}
		if (
			value === "DECLINE" ||
			value === "REJECT" ||
			value === "REJECTED" ||
			value === "DENIED"
		) {
			return "DECLINE";
		}
		return "MANUAL_REVIEW";
	};

	const submitDecision = async (item, action: "approve" | "reject", overrideData) => {
		const endpoint = getDecisionEndpoint({
			decisionType: item.decisionType,
			targetResource: item.targetResource,
			reviewType: item.reviewType,
			stage: item.stage,
		});

		if (isProcurementReview(item)) {
			const procureCheckAnomalies =
				item.anomalies && item.anomalies.length > 0
					? item.anomalies
					: item.procurementCheckFailed
						? [
								"Automated ProcureCheck execution failed - manual human procurement check required",
							]
						: [];

			const procurementPayload = {
				workflowId: item.id,
				applicantId: item.applicantId,
				procureCheckResult: {
					riskScore: Math.min(100, Math.max(0, item.procurementScore ?? 50)),
					anomalies: procureCheckAnomalies,
					recommendedAction: normalizeProcurementRecommendation(
						item.procurementRecommendedAction || item.recommendation
					),
					rawData: {
						procurementCheckFailed: item.procurementCheckFailed,
						procurementFailureReason: item.procurementFailureReason,
						procurementFailureSource: item.procurementFailureSource,
						procurementFailureGuidance: item.procurementFailureGuidance,
						reviewType: item.reviewType || "procurement",
					},
				},
				decision: {
					outcome: action === "approve" ? "CLEARED" : "DENIED",
					overrideCategory: overrideData.overrideCategory,
					overrideSubcategory: overrideData.overrideSubcategory,
					overrideDetails: overrideData.overrideDetails,
				},
			};

			const procurementResponse = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(procurementPayload),
			});

			if (!procurementResponse.ok) {
				const errorData = await procurementResponse.json().catch(() => ({}));
				throw new Error(
					errorData.message ||
						errorData.error ||
						`Failed to ${action === "approve" ? "clear" : "deny"} procurement review`
				);
			}

			return;
		}

		const generalDecisionPayload = {
			workflowId: item.id,
			applicantId: item.applicantId,
			decision: {
				outcome: action === "approve" ? "APPROVED" : "REJECTED",
				overrideCategory: overrideData.overrideCategory,
				overrideSubcategory: overrideData.overrideSubcategory,
				overrideDetails: overrideData.overrideDetails,
			},
		};

		const generalResponse = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(generalDecisionPayload),
		});

		if (!generalResponse.ok) {
			const errorData = await generalResponse.json().catch(() => ({}));
			throw new Error(
				errorData.message ||
					errorData.error ||
					`Failed to ${action === "approve" ? "approve" : "reject"}`
			);
		}
	};

	const fetchRiskReviewItems = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch(`/api/risk-review?showHistory=${showHistory}`);
			if (!response.ok) {
				throw new Error("Failed to fetch risk review items");
			}
			const data = await response.json();
			// Parse dates from ISO strings
			const parsedItems = (data.items || []).map(
				(item: RiskReviewItem & { createdAt: string | Date }) => ({
					...item,
					createdAt: new Date(item.createdAt),
				})
			);
			setItems(parsedItems);
		} catch (error) {
			console.error("Error fetching risk review items:", error);
			toast.error("Failed to load risk review queue");
		} finally {
			setIsLoading(false);
		}
	}, [showHistory]);

	useEffect(() => {
		fetchRiskReviewItems();
	}, [fetchRiskReviewItems]);

	const _handleApprove = async (id: number, overrideData: OverrideData) => {
		const item = items.find(i => i.id === id);
		if (!item) {
			toast.error("Workflow not found");
			return;
		}

		try {
			await submitDecision(item, "approve", overrideData);

			// Refresh the list
			await fetchRiskReviewItems();
			toast.success("Application approved successfully");
		} catch (error) {
			console.error("Approval error:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to approve application"
			);
		}
	};

	const _handleReject = async (id: number, overrideData: OverrideData) => {
		const item = items.find(i => i.id === id);
		if (!item) {
			toast.error("Workflow not found");
			return;
		}

		try {
			await submitDecision(item, "reject", overrideData);

			// Refresh the list
			await fetchRiskReviewItems();
			toast.success("Application rejected");
		} catch (error) {
			console.error("Rejection error:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to reject application"
			);
		}
	};

	const _handleViewDetails = (item: RiskReviewItem) => {
		setSelectedItem(item);
		setIsDetailOpen(true);
	};

	const highRiskCount = items.filter(item => (item.aiTrustScore || 100) < 60).length;
	const pendingCount = items.length;

	return (
		<DashboardLayout
			title="Risk Review"
			description="Manage and approve high-risk client applications"
			actions={
				<div className="flex gap-2">
					<Button
						variant="outline"
						className="gap-2"
						onClick={fetchRiskReviewItems}
						disabled={isLoading}>
						<RiRefreshLine className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
					<Button
						variant={showHistory ? "default" : "outline"}
						className="gap-2"
						onClick={() => setShowHistory(!showHistory)}>
						{showHistory ? "Hide History" : "Show History"}
					</Button>
					<Button variant="outline" className="gap-2">
						<RiFilter3Line className="h-4 w-4" />
						Filters
					</Button>
				</div>
			}>
			{/* Search and Stats Bar */}
			<div className="flex flex-col md:flex-row items-center gap-7 mb-6">
				<SearchInput
					placeholder="Search company, contact name..."
					value={searchTerm}
					onChange={setSearchTerm}
				/>
				<div className="flex gap-4">
					<div className="flex items-center h-11 gap-2 px-4 py-0 bg-destructive/20 border border-rose-500/20 rounded-lg text-destructive-foreground/70">
						<RiAlertLine className="h-4 w-4" />
						<span className="text-sm font-bold">{highRiskCount} High Risk</span>
					</div>
					<div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-200/20 rounded-lg text-warning-foreground">
						<RiTimeLine className="h-4 w-4" />
						<span className="text-sm font-bold">{pendingCount} Pending</span>
					</div>
				</div>
			</div>

			{/* Applicant Entities Table */}
			<div className="mt-8">
				<h2 className="text-lg font-semibold mb-4">Applicant Entities</h2>
				<RiskEntitiesTable
					key={showHistory ? "history" : "active"}
					search={searchTerm}
					showHistory={showHistory}
				/>
			</div>
		</DashboardLayout>
	);
}
