import { RiAlertFill, RiCheckFill } from "@remixicon/react";
import type React from "react";
import { cn } from "@/lib/utils";

// Types
export type StatusType = "success" | "warning" | "error" | "info" | "neutral" | "brand";

const statusStyles: Record<StatusType, string> = {
	// Dark mode compatible pastel/transparent styles
	success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
	warning: "bg-warning/50 text-warning-foreground border-warning",
	error: "bg-destructive/20 text-destructive-foreground border-rose-500/20",
	info: "bg-sky-500/10 text-sky-400 border-sky-500/20",
	neutral: "bg-secondary/20 text-muted-foreground border-sidebar-border",
	brand: "bg-primary/10 text-primary border-primary/20",
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	status?: StatusType;
	icon?: React.ReactNode;
}

export function StatusBadge({
	children,
	status = "neutral",
	icon,
	className,
	...props
}: StatusBadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 px-1.5 py-[1px] rounded-full text-xs font-medium border outline-1 backdrop-blur-sm",
				statusStyles[status],
				className
			)}
			{...props}>
			{icon && (
				<span className="h-3.5 w-3.5 flex items-center justify-center -ml-0.5">
					{icon}
				</span>
			)}
			{children}
		</span>
	);
}

// Stage Badge specifically for Workflow Stages
export function StageBadge({ stage }: { stage: string }) {
	let status: StatusType = "neutral";
	const normalized = stage.toLowerCase().replace("_", " ");

	if (
		normalized.includes("activ") ||
		normalized.includes("complet") ||
		normalized.includes("won")
	)
		status = "success";
	else if (
		normalized.includes("review") ||
		normalized.includes("fica") ||
		normalized.includes("negotiation")
	)
		status = "warning";
	else if (normalized.includes("contract") || normalized.includes("proposal"))
		status = "brand";
	else if (
		normalized.includes("lead") ||
		normalized.includes("applicant") ||
		normalized.includes("new")
	)
		status = "info";
	else if (normalized.includes("lost")) status = "error";

	const label = normalized
		.split(" ")
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");

	return <StatusBadge status={status}>{label}</StatusBadge>;
}

// Risk Badge
export function RiskBadge({ level }: { level: string }) {
	let status: StatusType = "neutral";
	const l = level.toLowerCase();

	if (l === "low" || l === "green") status = "success";
	else if (l === "medium" || l === "amber" || l === "yellow") status = "warning";
	else if (l === "high" || l === "red" || l === "critical") status = "error";

	const isError = status === "error";

	return (
		<StatusBadge
			status={status}
			icon={isError ? <RiAlertFill size={14} className="animate-bounce" /> : <RiCheckFill size={14} />}
			className="lowercase font-light tracking-wider">
			{level}
		</StatusBadge>
	);
}
