import { cn } from "@/lib/utils";

/**
 * DataSourceBadge — displays "Live" (green) or "Mock Data" (amber) indicator.
 *
 * Logic: if `dataSource` is nullish or contains the word "mock" (case-insensitive),
 * it renders the amber "Mock Data" badge; otherwise, green "Live".
 */
export function DataSourceBadge({ dataSource }: { dataSource?: string | null }) {
	const isMock = !dataSource || dataSource.toLowerCase().includes("mock");

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
				isMock
					? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
					: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
			)}
			title={dataSource || "Mock Data"}>
			<span
				className={cn(
					"h-1.5 w-1.5 rounded-full",
					isMock ? "bg-amber-500" : "bg-emerald-500"
				)}
			/>
			{isMock ? "Mock Data" : "Live"}
		</span>
	);
}
