"use client";

import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	meta?: Record<string, any>;
	/** Server-driven pagination — total number of pages */
	pageCount?: number;
	/** Current page index (0-based) */
	pageIndex?: number;
	/** Callback when page changes */
	onPageChange?: (pageIndex: number) => void;
	/** Rows per page (default: 10) */
	pageSize?: number;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	meta,
	pageCount,
	pageIndex,
	onPageChange,
	pageSize = 10,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);

	const isServerPaginated = onPageChange !== undefined;

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		...(isServerPaginated
			? {
					manualPagination: true,
					pageCount: pageCount ?? -1,
				}
			: {
					getPaginationRowModel: getPaginationRowModel(),
				}),
		state: {
			sorting,
			...(isServerPaginated && {
				pagination: {
					pageIndex: pageIndex ?? 0,
					pageSize,
				},
			}),
		},
		meta,
	});

	const currentPage = isServerPaginated
		? (pageIndex ?? 0)
		: table.getState().pagination.pageIndex;

	const totalPages = isServerPaginated ? (pageCount ?? 1) : table.getPageCount();

	const canGoPrevious = currentPage > 0;
	const canGoNext = currentPage < totalPages - 1;

	const handlePrevious = () => {
		if (isServerPaginated) {
			onPageChange?.(currentPage - 1);
		} else {
			table.previousPage();
		}
	};

	const handleNext = () => {
		if (isServerPaginated) {
			onPageChange?.(currentPage + 1);
		} else {
			table.nextPage();
		}
	};

	const showPagination = isServerPaginated || table.getPageCount() > 1;

	return (
		<div className="w-full space-y-4">
			<div className="rounded-2xl border border-sidebar-border bg-card/90 shadow-[0_15px_20px_rgba(0,0,0,0.1)] overflow-hidden backdrop-blur-sm">
				<Table>
					<TableHeader className="bg-sidebar/50">
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow
								key={headerGroup.id}
								className="hover:bg-transparent border-secondary/5">
								{headerGroup.headers.map(header => {
									return (
										<TableHead
											key={header.id}
											className="px-3 py-2 text-xs font-light text-muted-foreground/80 tracking-tight">
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map(row => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
									className="group pl-4 border-sidebar-border hover:bg-secondary/4 transition-all duration-200">
									{row.getVisibleCells().map(cell => (
										<TableCell key={cell.id} className="px-8 py-4">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-muted-foreground">
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>

				{/* Pagination Footer */}
				{showPagination && (
					<div className="flex items-center justify-between px-4 py-3 border-t border-sidebar-border bg-sidebar/30">
						<span className="text-xs text-muted-foreground">
							Page {currentPage + 1} of {totalPages}
						</span>
						<div className="flex items-center gap-1">
							<Button
								variant="default"
								size="icon"
								className="h-8 w-8"
								onClick={handlePrevious}
								disabled={!canGoPrevious}>
								<RiArrowLeftSLine className="h-4 w-4" />
							</Button>
							<Button
								variant="default"
								size="icon"
								className="h-8 w-8"
								onClick={handleNext}
								disabled={!canGoNext}>
								<RiArrowRightSLine className="h-4 w-4" />
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
