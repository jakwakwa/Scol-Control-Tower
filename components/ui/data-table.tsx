"use client";

import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import type { ColumnDef, SortingState, TableMeta } from "@tanstack/react-table";
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
	meta?: TableMeta<TData>;
	pageCount?: number;
	pageIndex?: number;
	onPageChange?: (pageIndex: number) => void;
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
			<div className="rounded-2xl border border-sidebar-border bg-card shadow-[0_15px_20px_rgba(0,0,0,0.1)] overflow-hidden backdrop-blur-sm">
				<Table>
					<TableHeader className="bg-sidebar/50">
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow
								key={headerGroup.id}
								className="hover:bg-black/20 border-zinc-500/10">
								{headerGroup.headers.map(header => {
									return (
										<TableHead
											key={header.id}
											className="px-3 py-2 text-xs font-light text-muted-foregroun tracking-tight">
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
									className="group pl-4 border-sidebar-border hover:bg-black/20 transition-all duration-200">
									{row.getVisibleCells().map(cell => (
										<TableCell key={cell.id} className="px-8 py-0 h-22">
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
					<div className="flex items-center justify-between px-4 py-0 border-t border-sidebar-border bg-accent shadow-lg shadow-black/30">
						<span className="text-xs text-muted-foreground">
							Page {currentPage + 1} of {totalPages}
						</span>
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								aria-label="Previous page"
								onClick={handlePrevious}
								disabled={!canGoPrevious}>
								<RiArrowLeftSLine className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								aria-label="Next page"
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
