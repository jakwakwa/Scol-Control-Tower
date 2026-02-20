import type { RemixiconComponentType } from "@remixicon/react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
	title: string;
	value: string | number;
	change?: {
		value: number;
		trend: "up" | "down" | "neutral";
	};
	icon: RemixiconComponentType;
	iconColor?: "amber" | "green" | "blue" | "purple" | "red";
	className?: string;
}

const iconColorClasses = {
	amber: "bg-stone-500/20 text-stone-400",
	green: "bg-emerald-500/30 text-emerald-600/80",
	blue: "bg-blue-500/20 text-blue-400",
	purple: "bg-purple-500/20 text-purple-400",
	red: "bg-red-500/20 text-red-400",
};

export function StatsCard({
	title,
	value,
	change,
	icon: Icon,
	iconColor = "amber",
	className,
}: StatsCardProps) {
	return (
		<div
			className={cn(
				"group relative overflow-hidden rounded-2xl border border-sidebar-border bg-card/50 backdrop-blur-sm p-6",
				"shadow-xl shadow-black/5",
				"transition-all duration-300 hover:bg-card/70 hover:border-secondary/10 hover:shadow-2xl hover:-translate-y-1",
				className
			)}>
			{/* Background gradient effect */}
			<div className="absolute inset-0 bg-linear-to-br from-secondary/2 to-transparent" />
			<div
				className={cn(
					"flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 mb-2",
					iconColorClasses[iconColor]
				)}>
				<Icon className="h-4 w-4" />
			</div>
			{/* Content */}
			<div className="relative flex items-start justify-between">
				<div className="space-y-2">
					<p className="text-sm font-medium text-muted-foreground">{title}</p>
					<p className="text-2xl font-bold tracking-tight">{value}</p>

					{change && (
						<div className="flex items-center gap-1.5">
							<span
								className={cn(
									"text-xs font-medium",
									change.trend === "up" && "text-emerald-600/80",
									change.trend === "down" && "text-red-400",
									change.trend === "neutral" && "text-muted-foreground"
								)}>
								{change.trend === "up" && "↑"}
								{change.trend === "down" && "↓"}
								{change.value > 0 ? "+" : ""}
								{change.value}%
							</span>
							<span className="text-xs text-muted-foreground">vs last week</span>
						</div>
					)}
				</div>
			</div>

			{/* Bottom accent line */}
			<div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-stone-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
		</div>
	);
}

// Compact version for sidebar or smaller areas
interface StatsCardCompactProps {
	label: string;
	value: string | number;
	icon: RemixiconComponentType;
	iconColor?: keyof typeof iconColorClasses;
}

export function StatsCardCompact({
	label,
	value,
	icon: Icon,
	iconColor = "amber",
}: StatsCardCompactProps) {
	return (
		<div className="flex items-center gap-3 rounded-xl bg-secondary/2 p-3">
			<div
				className={cn(
					"flex h-10 w-10 items-center justify-center rounded-lg",
					iconColorClasses[iconColor]
				)}>
				<Icon className="h-5 w-5" />
			</div>
			<div>
				<p className="text-xs font-medium text-muted-foreground">{label}</p>
				<p className="text-lg font-bold">{value}</p>
			</div>
		</div>
	);
}
