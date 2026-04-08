import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
	parseWorkflowEventPayload,
	type WorkflowTimelineItem,
} from "@/lib/dashboard/workflow-timeline-mapper";
import { cn } from "@/lib/utils";

interface WorkflowActivityTimelineProps {
	items: WorkflowTimelineItem[];
	workflowStartedAt: Date | null;
}

export function WorkflowActivityTimeline({
	items,
	workflowStartedAt,
}: WorkflowActivityTimelineProps) {
	return (
		<div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-border">
			{items.map(item => (
				<TimelineEvent key={item.id} item={item} />
			))}

			<div className="relative">
				<div className="absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border border-background ring-4 ring-background bg-blue-500" />
				<div className="flex flex-col">
					<span className="text-sm font-medium text-foreground">Workflow Started</span>
					<span className="text-xs text-muted-foreground">
						{formatDistanceToNow(workflowStartedAt ?? new Date())} ago
					</span>
				</div>
			</div>
		</div>
	);
}

function TimelineEvent({ item }: { item: WorkflowTimelineItem }) {
	return (
		<div className="relative">
			<div
				className={cn(
					"absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border border-background ring-4 ring-background",
					item.dotTone === "error" ? "bg-red-500" : "bg-emerald-500"
				)}
			/>

			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-foreground">{item.title}</span>
					<span className="text-xs text-muted-foreground">
						{formatDistanceToNow(item.timestamp)} ago
					</span>
				</div>

				{item.procurementFailureBanner && (
					<div className="mt-1 p-2 rounded-md border border-red-500/20 bg-red-500/10 text-xs text-red-200">
						Automated procurement checks did not run. Continue with available Stage 3
						outputs and complete a full manual procurement check in Risk Review.
					</div>
				)}

				{item.payload && (
					<div className="mt-1.5 p-3 rounded-lg bg-muted/50 border border-border text-xs font-mono text-muted-foreground overflow-hidden">
						<PayloadItems payload={item.payload} parsedPayload={item.parsedPayload} />
					</div>
				)}

				<div className="flex items-center gap-2 mt-1">
					<Badge
						variant="secondary"
						className="h-5 px-1.5 text-[10px] bg-muted text-muted-foreground hover:bg-muted/80">
						{item.actorBadgeLabel}
					</Badge>
					{item.actorId && (
						<span className="text-[10px] text-muted-foreground font-mono">
							id: {item.actorId}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function truncatePayload(payload: string, maxLength = 500) {
	if (payload.length <= maxLength) return payload;
	return `${payload.slice(0, maxLength)}...`;
}

function PayloadItems({
	payload,
	parsedPayload,
}: {
	payload: string | null;
	parsedPayload?: Record<string, unknown> | null;
}) {
	if (!payload) return null;

	const data = isPlainObject(parsedPayload)
		? parsedPayload
		: parseWorkflowEventPayload(payload);

	if (isPlainObject(data)) {
		return (
			<ul className="space-y-1">
				{Object.entries(data)
					.slice(0, 5)
					.map(([key, val]) => (
						<li key={key} className="flex gap-2">
							<span className="text-muted-foreground">{key}:</span>
							<span className="text-foreground truncate max-w-[200px]">
								{typeof val === "object" && val !== null
									? JSON.stringify(val)
									: String(val)}
							</span>
						</li>
					))}
			</ul>
		);
	}

	const displayPayload = truncatePayload(payload);
	return <span className="break-words">{displayPayload}</span>;
}
