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
import { type MouseEvent, useEffect, useState } from "react";
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
	severity?: "low" | "medium" | "high" | "critical";
	groupKey?: string;
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
		bgColor: "bg-emerald-500/70",
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

const MANUAL_FALLBACK_ALERT_TERMS = [
	"manual procurement check required",
	"procurement_check_failed",
	"procurecheck failed",
	"procurement check failed",
	"manual sanctions check required",
	"sanctions_check_failed",
	"automated sanctions checks failed",
];

function isManualFallbackNotification(message: string): boolean {
	const normalized = message.toLowerCase();
	return MANUAL_FALLBACK_ALERT_TERMS.some(term => normalized.includes(term));
}

function isManualSanctionsNotification(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("manual sanctions check required") ||
		normalized.includes("sanctions_check_failed") ||
		normalized.includes("automated sanctions checks failed")
	);
}

function formatNotificationMessage(message: string): string {
	if (!isManualFallbackNotification(message)) {
		return message;
	}
	if (isManualSanctionsNotification(message)) {
		return "Automated sanctions checks failed. Risk Manager must complete a full manual sanctions screening and record the sanctions outcome.";
	}
	return "Automated procurement checks failed. Risk Manager must complete a full manual procurement check and record a procurement decision.";
}

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
	const [isOpen, setIsOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const unreadCount = notifications?.filter(n => !n.read).length;

	// Delay rendering until after hydration to prevent Radix UI aria-controls ID mismatch
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const handleAction = async (
		e: MouseEvent,
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
	if (!isMounted) {
		return (
			<Button
				variant="ghost"
				size="icon"
				className="relative h-9 w-9 hover:bg-background/50">
				<RiNotification3Line className="h-5 w-5" />
				{unreadCount > 0 && (
					<Badge
						variant="destructive"
						className="absolute right-2 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px] animate-pulse">
						<span className="text-white text-[8px]">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					</Badge>
				)}
			</Button>
		);
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative h-9 w-9 hover:bg-background/50">
					<RiNotification3Line className="h-5 w-5" />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute right-5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px] animate-pulse">
							<span className="text-white text-[8px]">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[380px] border-secondary/10 bg-black/40 backdrop-blur-sm p-0">
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
				<div className="flex flex-col h-[400px] overflow-y-auto gap-1 p-0">
					{notifications?.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<RiNotification3Line className="h-10 w-10 text-muted-foreground/30" />
							<p className="mt-3 text-sm text-muted-foreground">No notifications yet</p>
						</div>
					) : (
						notifications?.map(notification => {
							const isHighSeverity =
								notification?.severity === "high" ||
								notification?.severity === "critical";
							const isMediumGrouped =
								notification?.severity === "medium" && notification?.groupKey;
							const config =
								notificationConfig[notification?.type] ?? notificationConfig.info;
							const Icon = config.icon;
							const isManualProcurementAlert = isManualFallbackNotification(
								notification?.message || ""
							);

							return (
								<div
									key={notification?.id}
									className={cn(
										"group relative flex gap-0 x-4 py-0 mb-0  items-center justify-between  h-[130px] min-h-[130px] transition-colors",
										!notification?.read && "bg-secondary/0",
										isHighSeverity && "bg-destructive text-destructive-foreground",
										isMediumGrouped && "bg-warning/20 border-4 border-l-warning"
									)}>
									{/* Main Action Button */}
									<button
										type="button"
										className="absolute bg-sidebar -inset-1 z-20 m-0 w-full border-1 rounded-xl border-white/10 left-[0px] max-w-[95%] p-0 focus:outline-none"
										onClick={() => onNotificationClick?.(notification)}>
										<span className="sr-only mt-4">
											View notification from {notification?.clientName}
										</span>
									</button>

									{!notification?.read && (
										<span className="absolute  h-2 w-2  top-5 z-30 shrink-0 left-6 rounded-full bg-zinc-800 outline-zinc-600 outline-2" />
									)}

									{/* Icon */}
									<div
										className={cn(
											" z-30 top-14  left-5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full absolute pointer-events-none mr-2",
											config.bgColor
										)}>
										<Icon className={cn("  rounded-full w-3 h-3", config.color)} />
									</div>

									{/* Content */}
									<div className="ml-12  mt-0 mr-6 relative z-20 pointer-events-none">
										<div className="flex items-between justify-between gap-2">
											<div className="flex items-center gap-4 w-full max-w-7/9">
												<p className="text-xs font-medium truncate w-fit text-secondary-foreground/70 mb-1">
													{notification?.clientName}
												</p>
												{isManualProcurementAlert && (
													<Badge
														variant="outline"
														className="text-[10px] text-red-300 border-red-500/30 bg-red-500/10">
														Manual Check
													</Badge>
												)}
											</div>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={e => {
														e.stopPropagation();
														onDelete?.(notification);
													}}
													className="text-muted-foreground/40 hover:text-red-400transition-colors cursor-pointer  absolute -right-4 pointer-events-auto p-0">
													<RiCloseLine className="h-4 w-4" />
													<span className="sr-only">Dismiss</span>
												</button>
											</div>
										</div>
										<p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
											{formatNotificationMessage(notification?.message || "")}
										</p>
										<div className="flex items-center justify-between mt-2 relative">
											<span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
												<RiTimeLine className="h-3 w-3" />
												{formatRelativeTime(notification?.timestamp)}
											</span>

											{/* Actionable Buttons */}
											{notification?.actionable && (
												<div className="flex gap-1 pointer-events-auto">
													{isManualProcurementAlert && (
														<Button
															variant="ghost"
															size="sm"
															className="absolute h-4 px-2 text-xs hover:bg-amber-500/20 hover:text-amber-300"
															onClick={e => handleAction(e, notification, "view")}>
															Open Risk Review
														</Button>
													)}
													{/* Approval Actions */}
													{!isManualProcurementAlert &&
														(notification?.type === "awaiting" ||
															notification?.type === "warning") && (
															<Button
																variant="ghost"
																size="sm"
																className="absolute h-3 px-2 text-xs hover:bg-emerald-500/0 hidden hover:text-emerald-600/80"
																onClick={e => handleAction(e, notification, "view")}>
																View
															</Button>
														)}
													{/* Error/Timeout Actions */}
													{!isManualProcurementAlert &&
														(notification?.type === "error" ||
															notification?.type === "timeout" ||
															notification?.type === "paused") && (
															<>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-6 px-2 text-xs hover:bg-blue-500/80 hover:text-blue-400"
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
