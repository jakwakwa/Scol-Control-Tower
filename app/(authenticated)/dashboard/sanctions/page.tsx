"use client";

import { RiFilter3Line, RiRefreshLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout, SearchInput } from "@/components/dashboard";
import {
	SanctionAdjudication,
	type SanctionItem,
} from "@/components/dashboard/sanctions/sanction-adjudication";
import { Button } from "@/components/ui/button";

export default function SanctionsPage() {
	const [items, setItems] = useState<SanctionItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");

	const fetchItems = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/sanctions");
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to fetch");
			}
			const data = await res.json();
			setItems(data.items || []);
		} catch (err) {
			console.error("Error fetching sanctions:", err);
			toast.error("Failed to load sanctions adjudicator queue");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	const filteredItems = items.filter(
		item =>
			item.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			item.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			item.matchedEntity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			item.sanctionListSource?.toLowerCase().includes(searchTerm.toLowerCase())
	);

	return (
		<DashboardLayout
			title="Sanctions Adjudication"
			description="Review and adjudicate flagged sanction matches for onboarding applicants"
			actions={
				<div className="flex gap-2">
					<Button
						variant="outline"
						className="gap-2"
						onClick={fetchItems}
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
			{/* Search Bar */}
			<div className="flex flex-col md:flex-row items-center gap-7 mb-6">
				<SearchInput
					placeholder="Search company, contact, or match..."
					value={searchTerm}
					onChange={setSearchTerm}
				/>
			</div>

			<SanctionAdjudication items={filteredItems} onRefresh={fetchItems} />
		</DashboardLayout>
	);
}
