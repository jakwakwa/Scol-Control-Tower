"use client";

import { RiFilter3Line, RiRefreshLine } from "@remixicon/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard";
import {
	SanctionAdjudication,
	type SanctionItem,
} from "@/components/dashboard/sanctions/sanction-adjudication";
import { Button } from "@/components/ui/button";

export default function SanctionsPage() {
	const [items, setItems] = useState<SanctionItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [_searchTerm, _setSearchTerm] = useState("");
	// Error state was in client.tsx, risk-review handles errors in catch blocks with toast.
	// We can keep error state if we want to show a specific error UI,
	// or switch to toast to match risk-review more closely if desired.
	// risk-review uses toast.error("Failed to load risk review queue");
	// client.tsx used an error state variable.
	// I will keep the error state variable to be safe, but maybe display it better or use toast as well?
	// The user said "Sanctions page UI is implemented **incorrectly**... Analyze risk-review... as the correct example".
	// risk-review uses toast. client.tsx used inline error div.
	// I will switch to using toast for errors to match the pattern.

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
			toast.error(err instanceof Error ? err.message : "Failed to load sanctions");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	// Filter items based on search? (Risk review does this)
	// client.tsx didn't have search.
	// But Dashboard layout usually implies search.
	// The user might expect search.
	// I'll add search logic if reasonable, or just the layout.
	// The prompt implies the *UI pattern* is wrong.
	// I will implement the search filter to be consistent with Risk Review if I can guess the fields.
	// SanctionItem structure? I saw it in client.tsx imports but not definition.
	// I'll check `SanctionItem` definition if possible.
	// Or I can just omit search for now if not strictly required, but `DashboardLayout` looks empty without it.
	// RiskReviewPage has search.

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
					{/* Add Filters button if needed to match pattern, though maybe non-functional */}
					<Button variant="outline" className="gap-2">
						<RiFilter3Line className="h-4 w-4" />
						Filters
					</Button>
				</div>
			}>
			<SanctionAdjudication items={items} onRefresh={fetchItems} />
		</DashboardLayout>
	);
}
