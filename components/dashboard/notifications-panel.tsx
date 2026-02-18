"use client";

import {
	RiAlertLine,
	RiCheckDoubleLine,
	RiCheckLine,
	RiCloseLine,
	RiNotification3Line,
	RiPauseCircleLine,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface WorkflowNotification {
	id: string;
	workflowId: number;
	applicantId: number;
	clientName: string;
	type:
		| "awaiting"
		| "completed"
		| "failed"
		| "timeout"
		| "paused"
		| "error"
		| "warning"
		| "info"
		| "success";
	message: string;
	timestamp: Date;
	read: boolean;
	actionable?: boolean;
}

const notificationConfig = {
	awaiting: {
		icon: RiUserLine,
		color: "text-warning-foreground",
		bgColor: "bg-warning/50",
	},
	completed: {
		icon: RiCheckLine,
		color: "text-emerald-700",
		bgColor: "bg-teal-500/40",
	},
	failed: {
		icon: RiCloseLine,
		color: "text-red-300",
		bgColor: "bg-red-800",
	},
	timeout: {
		icon: RiAlertLine,
		color: "text-orange-500",
		bgColor: "bg-orange-500/10",
	},
	paused: {
		icon: RiPauseCircleLine,
		color: "text-warning-foreground",
		bgColor: "bg-warning/50",
	},
	error: {
		icon: RiAlertLine,
		color: "text-red-500",
		bgColor: "bg-red-500/10",
	},
	warning: {
		icon: RiAlertLine,
		color: "text-amber-500",
		bgColor: "bg-amber-500/20",
	},
	info: {
		icon: RiNotification3Line,
		color: "text-blue-500",
		bgColor: "bg-blue-500/10",
	},
	success: {
		icon: RiCheckLine,
		color: "text-emerald-500",
		bgColor: "bg-emerald-500/10",
	},
};

interface NotificationsPanelProps {
	notifications: WorkflowNotification[];
	onMarkAllRead?: () => void;
	onNotificationClick?: (notification: WorkflowNotification) => void;
	onAction?: (
		notification: WorkflowNotification,
		action: "approve" | "reject" | "retry" | "cancel" | "view"
	) => void;
	onDelete?: (notification: WorkflowNotification) => void;
}

export function NotificationsPanel({
	notifications,
	onMarkAllRead,
	onNotificationClick,
	onAction,
	onDelete,
}: NotificationsPanelProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [_isMounted, setIsMounted] = React.useState(false);
	const unreadCount = notifications?.filter(n => !n.read).length;

	// Delay rendering until after hydration to prevent Radix UI aria-controls ID mismatch
	React.useEffect(() => {
		setIsMounted(true);
	}, []);

	const handleAction = async (
		e: React.MouseEvent,
		notification: WorkflowNotification,
		action: "approve" | "reject" | "retry" | "cancel" | "view"
	) => {
		e.stopPropagation();

		try {
			onAction?.(notification, action);

			// Toast is handled by the caller or we can add it here if needed
			// Removing the generic success toast here as it might be confusing for retry/cancel
		} catch {
			toast.error("Failed to process action");
		}
	};

	// Render a non-interactive placeholder during SSR to prevent hydration mismatch
	if (!isMount	ed
	)
	return (
		<Button
			variant="ghost"
			size="icon"
			className="relative h-9 w-9 hover:bg-secondary/10">
			<RiNotification3Line className="h-5 w-5" />
			{unreadCount > 0 && (
				<Badge
					variant="destructive"
					className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px] animate-pulse">
					<span className="text-white text-[8px]">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				</Badge>
			)}
		</Button>
	);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative h-9 w-9 hover:bg-secondary/10">
					<RiNotification3Line className="h-5 w-5" />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px] animate-pulse">
							<span className="text-white text-[8px]">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[380px] border-secondary/10 bg-zinc-100/10 backdrop-blur-sm p-0">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-secondary/10 px-4 py-3">
					<h3 className="text-sm font-semibold">Notifications</h3>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
							onClick={onMarkAllRead}>
							<RiCheckDoubleLine className="h-3.5 w-3.5" />
							Mark all read
						</Button>
					)}
				</div>

				{/* Notifications List */}
				<div className="max-h-[400px] overflow-y-auto">
					{notifications?.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<RiNotification3Line className="h-10 w-10 text-muted-foreground/30" />
							<p className="mt-3 text-sm text-muted-foreground">No notifications yet</p>
						</div>
					) : (
						notifications?.map(notification => {
							const config =
								notificationConfig[notification?.type] ?? notificationConfig.info;
							const Icon = config.icon;

							return (
								<div
									key={notification?.id}
									className={cn(
										"group relative flex gap-3 px-4 py-3 border-b border-secondary/5 transition-colors hover:bg-secondary/5",
										!notification?.read && "bg-secondary/2"
									)}>
									{/* Main Action Button */}
									<button
										type="button"
										className="absolute inset-0 z-0 w-full h-full focus:outline-none"
										onClick={() => onNotificationClick?.(notification)}>
										<span className="sr-only">
											View notification from {notification?.clientName}
										</span>
									</button>

									{/* Icon */}
									<div
										className={cn(
											"relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full pointer-events-none",
											config.bgColor
										)}>
										<Icon className={cn("h-4 w-4", config.color)} />
									</div>

									{/* Content */}
									<div className="flex-1 min-w-0 relative z-10 pointer-events-none">
										<div className="flex items-start justify-between gap-2">
											<p className="text-sm font-medium truncate">
												{notification?.clientName}
											</p>
											<div className="flex items-center gap-2">
												{!notification?.read && (
													<span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
												)}
												<button
													type="button"
													onClick={e => {
														e.stopPropagation();
														onDelete?.(notification);
													}}
													className="text-muted-foreground/40 hover:text-red-400 transition-colors cursor-pointer pointer-events-auto p-1">
													<RiCloseLine className="h-4 w-4" />
													<span className="sr-only">Dismiss</span>
												</button>
											</div>
										</div>
										<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
											{notification?.message}
										</p>
										<div className="flex items-center justify-between mt-2">
											<span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
												<RiTimeLine className="h-3 w-3" />
												{formatRelativeTime(notification?.timestamp)}
											</span>

											{/* Actionable Buttons */}
											{notification?.actionable && (
												<div className="flex gap-1 pointer-events-auto">
													{/* Approval Actions */}
													{(notification?.type === "awaiting" ||
														notification?.type === "warning") && (
														<Button
															variant="ghost"
															size="sm"
															className="h-6 px-2 text-xs hover:bg-teal-500/40 hover:text-emerald-600/80"
															onClick={e => handleAction(e, notification, "view")}>
															View
														</Button>
													)}
													{/* Error/Timeout Actions */}
													{(notification?.type === "error" ||
														notification?.type === "timeout" ||
														notification?.type === "paused") && (
														<>
															<Button
																variant="ghost"
																size="sm"
																className="h-6 px-2 text-xs hover:bg-blue-500/20 hover:text-blue-400"
																onClick={e => handleAction(e, notification, "retry")}>
																Retry
															</Button>
															<Button
																variant="ghost"
																size="sm"
																className="h-6 px-2 text-xs hover:bg-red-500/20 hover:text-red-400"
																onClick={e => handleAction(e, notification, "cancel")}>
																Cancel
															</Button>
														</>
													)}
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Footer */}
				{notifications?.length > 0 && (
					<div className="border-t border-secondary/10 p-2">
						<Link href="/dashboard/notifications">
							<Button
								variant="ghost"
								className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">
								View all notifications
							</Button>
						</Link>
					</div>
				)}
			</PopoverContent>
		</Popover>
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

// --- Toast Helpers with Actions ---

export function showWorkflowToast(
	type: "awaiting" | "completed" | "failed" | "timeout" | "paused" | "error",
	clientName: string,
	onAction?: (action: "approve" | "reject" | "view") => void
) {
	const config = {
		awaiting: {
			title: "Action Required",
			description: `${clientName}'s workflow needs your attention`,
			action: true,
		},
		completed: {
			title: "Workflow Completed",
			description: `${clientName}'s onboarding is complete`,
			action: false,
		},
		failed: {
			title: "Workflow Failed",
			description: `${clientName}'s workflow encountered an error`,
			action: false,
		},
		timeout: {
			title: "Workflow Timeout",
			description: `${clientName}'s workflow timed out waiting for response`,
			action: false,
		},
		paused: {
			title: "Workflow Paused",
			description: `${clientName}'s workflow is paused waiting for intervention`,
			action: true,
		},
		error: {
			title: "Workflow Error",
			description: `${clientName}'s workflow encountered a critical error`,
			action: false,
		},
	};

	const c = config[type];

	if (c.action) {
		toast(c.title, {
			description: c.description,
			action: {
				label: "Approve",
				onClick: () => onAction?.("approve"),
			},
			cancel: {
				label: "Reject",
				onClick: () => onAction?.("reject"),
			},
		});
	} else {
		toast[type === "completed" ? "success" : "error"](c.title, {
			description: c.description,
			action: {
				label: "View",
				onClick: () => onAction?.("view"),
			},
		});
	}
}
