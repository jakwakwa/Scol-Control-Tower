import {
	RiAlertLine,
	RiArrowRightLine,
	RiCheckLine,
	RiRobot2Line,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

type EventType =
	| "stage_change"
	| "agent_dispatch"
	| "agent_callback"
	| "human_adjudication"
	| "timeout"
	| "error"
	| "vat_verification_completed";

interface ActivityEvent {
	id: number;
	workflowId: number;
	clientName: string;
	eventType: EventType;
	description: string;
	timestamp: Date;
	actorType: "user" | "agent" | "platform";
	actorId?: string;
}

const eventConfig: Record<
	EventType,
	{ icon: typeof RiCheckLine; color: string; bgColor: string }
> = {
	stage_change: {
		icon: RiArrowRightLine,
		color: "text-blue-400",
		bgColor: "bg-blue-500/20",
	},
	agent_dispatch: {
		icon: RiRobot2Line,
		color: "text-stone-400",
		bgColor: "bg-stone-500/20",
	},
	agent_callback: {
		icon: RiCheckLine,
		color: "text-emerald-700",
		bgColor: "bg-emerald-500/70",
	},
	human_adjudication: {
		icon: RiUserLine,
		color: "text-purple-400",
		bgColor: "bg-purple-500/20",
	},
	timeout: {
		icon: RiTimeLine,
		color: "text-stone-400",
		bgColor: "bg-stone-500/20",
	},
	error: { icon: RiAlertLine, color: "text-red-400", bgColor: "bg-red-500/20" },
	vat_verification_completed: {
		icon: RiCheckLine,
		color: "text-teal-500",
		bgColor: "bg-teal-500/20",
	},
};

interface ActivityFeedProps {
	events: ActivityEvent[];
	maxItems?: number;
}

export function ActivityFeed({ events, maxItems = 10 }: ActivityFeedProps) {
	const displayEvents = events.slice(0, maxItems);

	if (displayEvents.length === 0) {
		return (
			<div className="rounded-xl bg-secondary/2 p-8 text-center">
				<RiTimeLine className="mx-auto h-8 w-8 text-muted-foreground/50" />
				<p className="mt-2 text-[9px] text-muted-foreground">No recent activity</p>
			</div>
		);
	}

	return (
		<div className="space-y-1 ">
			{displayEvents.map((event, index) => {
				const config = eventConfig[event.eventType];
				const Icon = config.icon;

				return (
					<div
						key={event.id}
						className={cn(
							"group flex items-start gap-2 rounded-xl p-2 transition-colors",
							"hover:bg-secondary/2"
						)}>
						{/* Timeline connector */}
						<div className="relative flex flex-col items-center">
							<div
								className={cn(
									"flex h-6 w-6 items-center justify-center rounded-md",
									config.bgColor
								)}>
								<Icon className={cn("h-4 w-4", config.color)} />
							</div>
							{index < displayEvents.length - 1 && (
								<div className="absolute top-10 h-full w-px bg-secondary/5" />
							)}
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0 pt-1">
							<div className="flex items-center gap-2">
								<span className="font-medium text-sm text-primary leading-none">
									{event.clientName}
								</span>
								<span className="text-[12px] text-muted-foreground">
									#{event.workflowId}
								</span>
							</div>
							<p className="text-[9px] truncate ellipsis line-clamp-2 whitespace-pre-line text-foreground/40 mt-0.5">
								{event.description}
							</p>
							<div className="flex items-center gap-2 mt-2 text-[9px] text-muted-foreground">
								<span>{formatRelativeTime(event.timestamp)}</span>
								{event.actorId && (
									<>
										<span>•</span>
										<code className="rounded text-[9px] bg-secondary/5 px-1.5 py-0.5">
											{event.actorId}
										</code>
									</>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// Compact timeline for workflow detail view
interface CompactTimelineProps {
	events: Array<{
		id: number;
		eventType: EventType;
		description: string;
		timestamp: Date;
	}>;
}

export function CompactTimeline({ events }: CompactTimelineProps) {
	return (
		<div className="relative space-y-4 pl-6">
			{/* Vertical line */}
			<div className="absolute left-2.5 top-2 bottom-2 w-px bg-background/50" />

			{events.map(event => {
				const config = eventConfig[event.eventType];
				const Icon = config.icon;

				return (
					<div key={event.id} className="relative flex items-start gap-4">
						{/* Dot */}
						<div
							className={cn(
								"absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full",
								config.bgColor
							)}>
							<Icon className={cn("h-3 w-3", config.color)} />
						</div>

						{/* Content */}
						<div className="flex-1">
							<p className="text-sm">{event.description}</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								{formatRelativeTime(event.timestamp)}
							</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}
