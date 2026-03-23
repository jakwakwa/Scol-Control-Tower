"use client";

import {
	RiArrowDownSLine,
	RiArrowUpSLine,
	RiFileChartLine,
	RiLoader4Line,
	RiSearchLine,
} from "@remixicon/react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

// --- Types ---

export interface RiskEntityRow {
	id: number;
	applicantId: number;
	companyName: string;
	procurementStatus: string;
	itcStatus: string;
	sanctionStatus: string;
	ficaStatus: string;
	procurementReviewState: string;
	itcReviewState: string;
	sanctionsReviewState: string;
	ficaReviewState: string;
	finalReportReady: boolean;
}

// --- Badge Rendering ---

type BadgeVariant =
	| "default"
	| "secondary"
	| "destructive"
	| "outline"
	| "warning"
	| "success"
	| "info";

function getCheckBadge(status: string): { variant: BadgeVariant; label: string } {
	const normalized = status.toLowerCase();

	switch (normalized) {
		case "completed":
		case "cleared":
		case "clear":
		case "verified":
		case "passed":
			return { variant: "success", label: formatLabel(normalized) };
		case "pending":
			return { variant: "secondary", label: "Pending" };
		case "in_progress":
			return { variant: "info", label: "In Progress" };
		case "manual_required":
			return { variant: "warning", label: "Manual Review" };
		case "flagged":
			return { variant: "warning", label: "Flagged" };
		case "submitted":
			return { variant: "info", label: "Submitted" };
		case "failed":
		case "rejected":
		case "confirmed_hit":
			return { variant: "destructive", label: formatLabel(normalized) };
		default:
			return { variant: "outline", label: status || "Unknown" };
	}
}

function formatLabel(status: string): string {
	return status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function CheckStatusBadge({ status }: { status: string }) {
	const { variant, label } = getCheckBadge(status);
	return (
		<Badge variant={variant} className="gap-1 text-[10px]">
			{label}
		</Badge>
	);
}

// --- Columns ---

const columns: ColumnDef<RiskEntityRow>[] = [
	{
		accessorKey: "companyName",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Business Name
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => (
			<span className="font-medium text-foreground">{row.original.companyName}</span>
		),
	},
	{
		accessorKey: "procurementStatus",
		header: () => <span className="text-xs font-semibold">Procurement</span>,
		cell: ({ row }) => <CheckStatusBadge status={row.original.procurementStatus} />,
		enableSorting: false,
	},
	{
		accessorKey: "itcStatus",
		header: () => <span className="text-xs font-semibold">ITC</span>,
		cell: ({ row }) => <CheckStatusBadge status={row.original.itcStatus} />,
		enableSorting: false,
	},
	{
		accessorKey: "sanctionStatus",
		header: () => <span className="text-xs font-semibold">Sanctions</span>,
		cell: ({ row }) => <CheckStatusBadge status={row.original.sanctionStatus} />,
		enableSorting: false,
	},
	{
		accessorKey: "ficaStatus",
		header: () => <span className="text-xs font-semibold">FICA</span>,
		cell: ({ row }) => <CheckStatusBadge status={row.original.ficaStatus} />,
		enableSorting: false,
	},
	{
		id: "finalReport",
		header: () => <span className="text-xs font-semibold">Final Report</span>,
		cell: ({ row }) => (
			<Link href={`/dashboard/risk-review/reports/${row.original.applicantId}`}>
				<Button variant="outline" size="xs" className="gap-1.5 text-xs">
					<RiFileChartLine className="h-3.5 w-3.5" />
					View Reports
				</Button>
			</Link>
		),
		enableSorting: false,
	},
];

// --- Main Component ---

const PAGE_SIZE = 10;

export function RiskEntitiesTable({ search = "" }: { search?: string }) {
	const [data, setData] = useState<RiskEntityRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [pageIndex, setPageIndex] = useState(0);
	const [pageCount, setPageCount] = useState(0);

	const fetchEntities = useCallback(async (page: number, searchTerm: string) => {
		setIsLoading(true);
		try {
			const response = await fetch(
				`/api/risk-review/entities?page=${page + 1}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(searchTerm)}`
			);
			if (!response.ok) {
				throw new Error("Failed to fetch risk entities");
			}
			const json = (await response.json()) as {
				items: RiskEntityRow[];
				pageCount: number;
			};
			setData(json.items || []);
			setPageCount(json.pageCount || 0);
		} catch (error) {
			console.error("Error fetching risk entities:", error);
			toast.error("Failed to load applicant entities");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchEntities(pageIndex, search);
	}, [fetchEntities, pageIndex, search]);

	const handlePageChange = (newPage: number) => {
		setPageIndex(newPage);
	};

	if (isLoading && data.length === 0) {
		return (
			<div className="rounded-2xl border border-sidebar-border bg-card/90 p-12 text-center">
				<RiLoader4Line className="mx-auto h-8 w-8 text-muted-foreground/50 animate-spin" />
				<p className="mt-4 text-sm text-muted-foreground">Loading applicant entities…</p>
			</div>
		);
	}

	if (!isLoading && data.length === 0) {
		return (
			<div className="rounded-2xl border border-sidebar-border bg-card/90 p-12 text-center">
				<RiSearchLine className="mx-auto h-12 w-12 text-muted-foreground/50" />
				<h3 className="mt-4 text-lg font-medium">No active workflows</h3>
				<p className="mt-2 text-sm text-muted-foreground">
					There are currently no applicants with in-progress workflows.
				</p>
			</div>
		);
	}

	return (
		<DataTable
			columns={columns}
			data={data}
			pageCount={pageCount}
			pageIndex={pageIndex}
			onPageChange={handlePageChange}
			pageSize={PAGE_SIZE}
		/>
	);
}
