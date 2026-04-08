"use client";

import { cn } from "@/lib/utils";

// ============================================
// Base Skeleton Component
// ============================================

interface SkeletonProps {
	className?: string;
	/** Animation variant */
	animate?: boolean;
}

function Skeleton({ className, animate = true }: SkeletonProps) {
	return (
		<div
			className={cn("rounded-md bg-background/50", animate && "animate-pulse", className)}
		/>
	);
}

// ============================================
// Stats Card Skeleton
// ============================================

export function StatsCardSkeleton() {
	return (
		<div className="rounded-2xl border border-sidebar-border bg-card/90 backdrop-blur-sm p-6 shadow-xl shadow-black/5">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-8 w-16" />
				</div>
				<Skeleton className="h-12 w-12 rounded-xl" />
			</div>
		</div>
	);
}

// ============================================
// Table Row Skeleton
// ============================================

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
	return (
		<tr className="border-b border-secondary/10">
			{Array.from({ length: columns }).map((_, i) => (
				<td key={i} className="p-4">
					<Skeleton className="h-5 w-full max-w-[150px]" />
				</td>
			))}
		</tr>
	);
}

export function TableSkeleton({
	rows = 5,
	columns = 5,
}: {
	rows?: number;
	columns?: number;
}) {
	return (
		<div className="rounded-xl border border-secondary/10 overflow-hidden">
			{/* Header */}
			<div className="bg-secondary/5 p-4 border-b border-secondary/10">
				<div className="flex gap-4">
					{Array.from({ length: columns }).map((_, i) => (
						<Skeleton key={i} className="h-4 w-24" />
					))}
				</div>
			</div>
			{/* Rows */}
			<table className="w-full">
				<tbody>
					{Array.from({ length: rows }).map((_, i) => (
						<TableRowSkeleton key={i} columns={columns} />
					))}
				</tbody>
			</table>
		</div>
	);
}

// ============================================
// Workflow Card Skeleton
// ============================================

export function WorkflowCardSkeleton() {
	return (
		<div className="rounded-xl border border-secondary/10 bg-card/30 p-5">
			<div className="flex items-start justify-between gap-4 mb-4">
				<div className="space-y-2 flex-1">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="h-3 w-24" />
				</div>
				<Skeleton className="h-10 w-10 rounded-full" />
			</div>
			<div className="grid grid-cols-3 gap-4 py-4 border-t border-secondary/10">
				<div className="text-center">
					<Skeleton className="h-3 w-16 mx-auto mb-2" />
					<Skeleton className="h-6 w-10 mx-auto" />
				</div>
				<div className="text-center">
					<Skeleton className="h-3 w-16 mx-auto mb-2" />
					<Skeleton className="h-6 w-10 mx-auto" />
				</div>
				<div className="text-center">
					<Skeleton className="h-3 w-16 mx-auto mb-2" />
					<Skeleton className="h-6 w-10 mx-auto" />
				</div>
			</div>
			<div className="flex justify-between pt-4 border-t border-secondary/10 mt-4">
				<Skeleton className="h-8 w-24" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-16" />
					<Skeleton className="h-8 w-16" />
				</div>
			</div>
		</div>
	);
}

// ============================================
// Risk Review Card Skeleton
// ============================================

export function RiskReviewCardSkeleton() {
	return (
		<div className="rounded-xl border border-secondary/10 bg-card/30 p-5 relative overflow-hidden">
			{/* Side indicator */}
			<div className="absolute left-0 top-0 h-full w-1 bg-secondary/20" />

			<div className="pl-2">
				{/* Header */}
				<div className="flex items-start justify-between gap-4 mb-4">
					<div className="space-y-2 flex-1">
						<Skeleton className="h-5 w-36" />
						<div className="flex gap-2">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
					<Skeleton className="h-20 w-20 rounded-full" />
				</div>

				{/* Metrics */}
				<div className="grid grid-cols-3 gap-4 py-4 border-t border-secondary/10">
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="text-center">
							<Skeleton className="h-3 w-14 mx-auto mb-2" />
							<Skeleton className="h-5 w-8 mx-auto" />
						</div>
					))}
				</div>

				{/* Flags */}
				<div className="flex gap-2 mt-4">
					<Skeleton className="h-5 w-20 rounded-full" />
					<Skeleton className="h-5 w-16 rounded-full" />
					<Skeleton className="h-5 w-24 rounded-full" />
				</div>

				{/* Actions */}
				<div className="flex justify-between pt-4 border-t border-secondary/10 mt-4">
					<Skeleton className="h-8 w-24" />
					<div className="flex gap-2">
						<Skeleton className="h-8 w-16" />
						<Skeleton className="h-8 w-16" />
					</div>
				</div>
			</div>
		</div>
	);
}

// ============================================
// Pipeline Column Skeleton
// ============================================

export function PipelineColumnSkeleton({ items = 3 }: { items?: number }) {
	return (
		<div className="rounded-xl border border-secondary/10 bg-card/30 p-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-4 pb-3 border-b border-secondary/10">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-5 w-8 rounded-full" />
			</div>

			{/* Cards */}
			<div className="space-y-3">
				{Array.from({ length: items }).map((_, i) => (
					<div
						key={i}
						className="p-3 rounded-lg bg-secondary/5 border border-secondary/10">
						<Skeleton className="h-4 w-28 mb-2" />
						<Skeleton className="h-3 w-20 mb-3" />
						<div className="flex gap-1">
							<Skeleton className="h-4 w-4 rounded-full" />
							<Skeleton className="h-4 w-4 rounded-full" />
							<Skeleton className="h-4 w-4 rounded-full" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================
// Dashboard Grid Skeleton
// ============================================

export function DashboardGridSkeleton({
	columns = 4,
	items = 4,
}: {
	columns?: number;
	items?: number;
}) {
	return (
		<div
			className={cn(
				"grid gap-4 lg:gap-6",
				columns === 1 && "grid-cols-1",
				columns === 2 && "grid-cols-1 md:grid-cols-2",
				columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
				columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
				columns === 6 && "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
			)}>
			{Array.from({ length: items }).map((_, i) => (
				<StatsCardSkeleton key={i} />
			))}
		</div>
	);
}

// ============================================
// Activity Feed Skeleton
// ============================================

export function ActivityFeedSkeleton({ items = 5 }: { items?: number }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: items }).map((_, i) => (
				<div key={i} className="flex items-start gap-3">
					<Skeleton className="h-8 w-8 rounded-full shrink-0" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<Skeleton className="h-3 w-12" />
				</div>
			))}
		</div>
	);
}

// ============================================
// Text Skeleton
// ============================================

export function TextSkeleton({
	lines = 3,
	lastLineWidth = "2/3",
}: {
	lines?: number;
	lastLineWidth?: string;
}) {
	return (
		<div className="space-y-2">
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					className={cn("h-4", i === lines - 1 ? `w-${lastLineWidth}` : "w-full")}
				/>
			))}
		</div>
	);
}

export { Skeleton };
