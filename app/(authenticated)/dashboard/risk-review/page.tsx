"use client";

import {
	RiAlertLine,
	RiFilter3Line,
	RiRefreshLine,
	RiSearchLine,
	RiTimeLine,
} from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard";
import {
	RiskReviewDetail,
	type RiskReviewItem,
	RiskReviewQueue,
} from "@/components/dashboard/risk-review";
import type { OverrideData } from "@/components/dashboard/risk-review/risk-review-queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RiskReviewPage() {
	const [searchTerm, setSearchTerm] = useState("");
	const [items, setItems] = useState<RiskReviewItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedItem, setSelectedItem] = useState<RiskReviewItem | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const fetchRiskReviewItems = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/risk-review");
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
	}, []);

	useEffect(() => {
		fetchRiskReviewItems();
	}, [fetchRiskReviewItems]);

	const handleApprove = async (id: number, overrideData: OverrideData) => {
		const item = items.find(i => i.id === id);
		if (!item) {
			toast.error("Workflow not found");
			return;
		}

		try {
			const response = await fetch("/api/risk-decision", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId: id,
					applicantId: item.applicantId,
					decision: {
						outcome: "APPROVED",
						overrideCategory: overrideData.overrideCategory,
						overrideSubcategory: overrideData.overrideSubcategory,
						overrideDetails: overrideData.overrideDetails,
					},
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || errorData.error || "Failed to approve");
			}

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

	const handleReject = async (id: number, overrideData: OverrideData) => {
		const item = items.find(i => i.id === id);
		if (!item) {
			toast.error("Workflow not found");
			return;
		}

		try {
			const response = await fetch("/api/risk-decision", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workflowId: id,
					applicantId: item.applicantId,
					decision: {
						outcome: "REJECTED",
						overrideCategory: overrideData.overrideCategory,
						overrideSubcategory: overrideData.overrideSubcategory,
						overrideDetails: overrideData.overrideDetails,
					},
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || errorData.error || "Failed to reject");
			}

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

	const handleViewDetails = (item: RiskReviewItem) => {
		setSelectedItem(item);
		setIsDetailOpen(true);
	};

	// Filter items based on search
	const filteredItems = items.filter(
		item =>
			item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			item.companyName.toLowerCase().includes(searchTerm.toLowerCase())
	);

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
					<Button variant="outline" className="gap-2">
						<RiFilter3Line className="h-4 w-4" />
						Filters
					</Button>
				</div>
			}>
			{/* Search and Stats Bar */}
			<div className="flex flex-col md:flex-row gap-4 mb-6">
				<div className="relative flex-1">
					<RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search company, contact name..."
						className="pl-10"
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
					/>
				</div>
				<div className="flex gap-4">
					<div className="flex items-center gap-2 px-4 py-2 bg-destructive/20 border border-rose-500/20 rounded-lg text-destructive-foreground">
						<RiAlertLine className="h-4 w-4" />
						<span className="text-sm font-bold">{highRiskCount} High Risk</span>
					</div>
					<div className="flex items-center gap-2 px-4 py-2 bg-warning/50 border border-warning rounded-lg text-warning-foreground">
						<RiTimeLine className="h-4 w-4" />
						<span className="text-sm font-bold">{pendingCount} Pending</span>
					</div>
				</div>
			</div>

			{/* Risk Review Queue */}
			<RiskReviewQueue
				items={filteredItems}
				isLoading={isLoading}
				onApprove={handleApprove}
				onReject={handleReject}
				onViewDetails={handleViewDetails}
				onRefresh={fetchRiskReviewItems}
			/>

			{/* Detail Sheet */}
			<RiskReviewDetail
				item={selectedItem}
				open={isDetailOpen}
				onOpenChange={setIsDetailOpen}
				onApprove={async (id, overrideData) => {
					await handleApprove(id, overrideData);
					setIsDetailOpen(false);
				}}
				onReject={async (id, overrideData) => {
					await handleReject(id, overrideData);
					setIsDetailOpen(false);
				}}
			/>
		</DashboardLayout>
	);
}
