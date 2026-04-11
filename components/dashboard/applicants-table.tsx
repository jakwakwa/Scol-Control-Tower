"use client";

import { RiArrowDownSLine, RiArrowUpSLine, RiMoreLine } from "@remixicon/react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// --- Types ---

export interface ApplicantRow {
	id: number;
	companyName: string;
	contactName: string;
	email: string;
	status: string;
	industry: string;
	employeeCount: number;
	createdAt: Date;
	workflowId?: number | null;
	workflowStage?: number | null;
	hasQuote?: boolean;
}

// --- Configuration ---

const statusConfig: Record<string, { label: string; color: string }> = {
	new: { label: "New", color: "bg-blue-500/20 text-blue-400" },
	contacted: { label: "Contacted", color: "bg-purple-500/20 text-purple-400" },
	qualified: { label: "Qualified", color: "bg-stone-500/20 text-stone-400" },
	proposal: { label: "Proposal", color: "bg-stone-500/20 text-stone-400" },
	negotiation: { label: "Negotiation", color: "bg-pink-500/20 text-pink-400" },
	won: { label: "Won", color: "bg-emerald-500/20 text-emerald-600/80" },
	lost: { label: "Lost", color: "bg-red-500/20 text-red-400" },
};

// --- Columns ---

export const columns: ColumnDef<ApplicantRow>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected()
						? true
						: table.getIsSomePageRowsSelected()
							? "indeterminate"
							: false
				}
				onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
				className="translate-y-0.5 hidden w-0"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={value => row.toggleSelected(!!value)}
				aria-label="Select row"
				className="translate-y-0.5 hidden w-0"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "companyName",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
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
			<Link
				href={`/dashboard/applicants/${row.original.id}`}
				className="font-medium text-foreground hover:text-primary hover:underline">
				{row.original.companyName}
			</Link>
		),
	},
	{
		accessorKey: "contactName",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Contact Name
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
			<div>
				<div className="text-xs font-light">{row.original.contactName}</div>
				<div className="text-xs font-light text-muted-foreground">
					{row.original.email}
				</div>
			</div>
		),
	},
	{
		accessorKey: "industry",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Industry
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
			<div className="text-sm text-muted-foreground">{row.original.industry}</div>
		),
	},
	{
		accessorKey: "employeeCount",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Employees
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
			<div className="text-sm">
				{row.original.employeeCount?.toLocaleString() || "n/a"}
			</div>
		),
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
				Status
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => {
			const config = statusConfig[row.original.status] || {
				label: row.original.status,
				color: "bg-black/20     text-muted-foreground",
			};
			return (
				<span
					className={cn(
						"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
						config.color
					)}>
					{config.label}
				</span>
			);
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const canViewQuote = row.original.workflowStage === 2 && row.original.hasQuote;

			return (
				<div className="flex items-center justify-end gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label="Open actions menu"
							className={cn(
								buttonVariants({ variant: "ghost", size: "icon" }),
								"h-8 w-8 hover:bg-background"
							)}>
							<RiMoreLine className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem asChild>
								<Link href={`/dashboard/applicants/${row.original.id}`}>
									View Details
								</Link>
							</DropdownMenuItem>
							{canViewQuote ? (
								<DropdownMenuItem asChild>
									<Link href={`/dashboard/applicants/${row.original.id}?tab=reviews`}>
										Review Quote
									</Link>
								</DropdownMenuItem>
							) : null}
							<DropdownMenuItem>Edit Applicant</DropdownMenuItem>
							<DropdownMenuItem>Start Workflow</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="text-destructive focus:text-destructive">
								Delete Applicant
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];

// --- Main Component ---

interface ApplicantsTableProps {
	applicants: ApplicantRow[];
}

export function ApplicantsTable({ applicants }: ApplicantsTableProps) {
	return <DataTable columns={columns} data={applicants} />;
}
