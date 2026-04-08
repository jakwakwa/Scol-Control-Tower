"use client";

import {
	RiAlertLine,
	RiCertificate2Line,
	RiCheckDoubleLine,
	RiCloseLine,
	RiNotification3Line,
	RiPauseCircleLine,
	RiProhibitedLine,
	RiSendInsLine,
	RiTimeLine,
	RiUserLine,
} from "@remixicon/react";
import { FileWarningIcon, StampIcon } from "lucide-react";
import Link from "next/link";
import { type ElementType, type MouseEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	formatNotificationMessage,
	isManualFallbackNotification,
	isVatNotification,
} from "@/lib/notifications/semantics";
import type { NotificationType } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export interface WorkflowNotification {
	id: string;
	workflowId: number;
	applicantId: number;
	clientName: string;
	type: NotificationType;
	message: string;
	timestamp: Date;
	read: boolean;
	actionable?: boolean;
	severity?: "low" | "medium" | "high" | "critical";
	groupKey?: string;
}

const notificationConfig: Record<
	NotificationType,
	{ icon: ElementType; color: string; bgColor: string }
> = {
	awaiting: {
		icon: RiUserLine,
		color: "text-violet-400",
		bgColor: "bg-violet-500/15",
	},
	completed: {
		icon: RiCertificate2Line,
		color: "text-cyan-400",
		bgColor: "bg-cyan-600/20",
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
		icon: FileWarningIcon,
		color: "text-yellow-300",
		bgColor: "bg-yellow-500/20",
	},
	info: {
		icon: StampIcon,
		color: "text-pink-400",
		bgColor: "bg-pink-500/10",
	},
	success: {
		icon: RiSendInsLine,
		color: "text-emerald-500",
		bgColor: "bg-emerald-700/20",
	},
	terminated: {
		icon: RiProhibitedLine,
		color: "text-red-700",
		bgColor: "bg-red-500/20",
	},
	reminder: {
		icon: RiTimeLine,
		color: "text-amber-300",
		bgColor: "bg-amber-500/10",
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
				aria-label="Open notifications"
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
					aria-label="Open notifications"
					className="relative h-9 w-9 hover:bg-background/50">
					<RiNotification3Line className="absolute h-5 w-5" />
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
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className=" border-amber-200/10 border bg-zinc-950/50 backdrop-blur-sm mx-0 px-0 my-0 overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-secondary/10 px-4 h-12 bg-black/40 m-0 w-full">
					<h3 className="text-xs font-light">Notifications</h3>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-7 gap-1.5 text-xs text-muted-foreground font-light hover:text-foreground"
							onClick={onMarkAllRead}>
							<RiCheckDoubleLine className="h-3.5 w-3.5" />
							Mark all read
						</Button>
					)}
				</div>

				{/* Notifications List */}
				<div className="flex flex-col h-[400px] overflow-y-auto gap-1.5 py-0 px-2">
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
							const isVatAlert = isVatNotification(notification?.message || "");

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
										className="absolute bg-zinc-950/60 -inset-1 z-20 m-0 w-full border hover:bg-cyan-400/5 transition-all  ease-in-out border-amber-300/15 rounded-xl left-0 p-0 focus:outline-1"
										onClick={() => onNotificationClick?.(notification)}>
										<span className="sr-only mt-4">
											View notification from {notification?.clientName}
										</span>
									</button>

									{!notification?.read && (
										<span className="absolute  h-1.5 w-1.5  top-7.5 z-30 shrink-0 left-4.5 rounded-full shadow-md shadow-teal-400 bg-zinc-800 outline-teal-500 outline-2" />
									)}

									{/* Icon */}
									<div
										className={cn(
											" z-30 top-14 bottom-1/2  left-3 flex h-6 p-0 m-0 w-6 shrink-0 items-center bg-transparent justify-center rounded-full absolute pointer-events-none ",
											config.bgColor
										)}>
										<Icon
											className={cn("  rounded-full w-3 h-3 bg-none", config.color)}
										/>
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
												{isVatAlert && (
													<Badge
														variant="outline"
														className="text-[10px] text-teal-300 border-teal-500/30 bg-teal-500/10">
														VAT Check
													</Badge>
												)}
											</div>
										</div>

										<p className="text-[11.5px] text-muted-foreground/90 italic font-extralight mt-1.5 line-clamp-3">
											{formatNotificationMessage(notification?.message || "")}
										</p>
										<div className="flex items-center  absolute z-40 top-0 gap-2 right-0">
											<button
												type="button"
												onClick={e => {
													e.stopPropagation();
													onDelete?.(notification);
												}}
												className="text-pink-400/70 bg-transparent hover:text-red-900 transition-colors text-xs border-red-700/50 cursor-pointer  absolute -right-6 pointer-events-auto p-2">
												<RiCloseLine className="h-2.5 p-0	border-0 outline-0  w-2.5 " />
												<span className="sr-only">Dismiss</span>
											</button>
										</div>
										<div className="flex items-center justify-between mt-2 relative">
											<span className="text-[10px] text-amber-200/80 flex items-center gap-1">
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
								variant="default"
								className="w-full h-8 text-xs text-muted-foreground bg-primary/50 hover:text-foreground">
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
	type:
		| "awaiting"
		| "completed"
		| "failed"
		| "timeout"
		| "paused"
		| "error"
		| "terminated",
	clientName: string,
	onAction?: (action: "approve" | "reject" | "view") => void
) {
	const config: Record<
		typeof type,
		{ title: string; description: string; action: boolean }
	> = {
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
		terminated: {
			title: "Workflow Terminated",
			description: `${clientName}'s workflow has been terminated`,
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
