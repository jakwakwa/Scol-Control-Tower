import type React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RiskReviewBadgeVariant = "default" | "success" | "warning" | "danger" | "gold" | "ai";

const variantClassMap: Record<RiskReviewBadgeVariant, string> = {
	default: "bg-secondary/90 text-muted-foreground border-border",
	success: "bg-chart-4/10 text-chart-4 border-chart-4/20",
	warning: "bg-warning/50 text-warning-foreground border-warning",
	danger: "bg-destructive/20 text-destructive-foreground border-destructive/30",
	gold: "bg-primary/20 text-primary border-primary/30",
	ai: "bg-primary/10 text-primary border-primary/30",
};

export function RiskReviewBadge({
	children,
	variant = "default",
	className,
}: {
	children: React.ReactNode;
	variant?: RiskReviewBadgeVariant;
	className?: string;
}) {
	return (
		<Badge
			variant="outline"
			className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", variantClassMap[variant], className)}>
			{children}
		</Badge>
	);
}
