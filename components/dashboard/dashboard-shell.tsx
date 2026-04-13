"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
import { getNotificationRoute } from "@/lib/notifications/semantics";
import { cn } from "@/lib/utils";
import { NotificationsPanel, type WorkflowNotification } from "./notifications-panel";
import { Sidebar } from "./sidebar";

const SSE_REFRESH_DEBOUNCE_MS = 500;

interface DashboardShellProps {
	children: React.ReactNode;
	notifications?: WorkflowNotification[];
}

export function DashboardShell({ children, notifications = [] }: DashboardShellProps) {
	const router = useRouter();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const { user } = useUser();

	const { title, description, actions } = useDashboardStore();

	const sseRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);
	const sseErrorCountRef = useRef(0);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (user?.id) {
			posthog.identify(user.id, {
				email: user.primaryEmailAddress?.emailAddress,
				name: user.fullName ?? undefined,
			});
		}
	}, [user?.id, user?.fullName, user?.primaryEmailAddress?.emailAddress]);

	// Real-time updates via SSE
	useEffect(() => {
		const eventSource = new EventSource("/api/notifications/stream");

		const scheduleRefresh = () => {
			clearTimeout(sseRefreshTimeoutRef.current);
			sseRefreshTimeoutRef.current = setTimeout(() => {
				sseRefreshTimeoutRef.current = undefined;
				router.refresh();
			}, SSE_REFRESH_DEBOUNCE_MS);
		};

		eventSource.onopen = () => {
			sseErrorCountRef.current = 0;
		};

		eventSource.onmessage = event => {
			try {
				const data = JSON.parse(event.data);
				if (data && (data.type === "notification" || data.type === "update")) {
					scheduleRefresh();
				}
			} catch (e) {
				console.error("Failed to parse notification event", e);
			}
		};

		eventSource.onerror = () => {
			if (eventSource.readyState !== EventSource.OPEN) {
				return;
			}
			sseErrorCountRef.current += 1;
			if (sseErrorCountRef.current >= 3) {
				console.warn(
					"[notifications-sse] repeated errors while open; check network or /api/notifications/stream"
				);
			}
		};

		return () => {
			clearTimeout(sseRefreshTimeoutRef.current);
			sseRefreshTimeoutRef.current = undefined;
			eventSource.close();
		};
	}, [router]);

	return (
		<>
			{/* BACKGROUNDS */}
			<div className="print:hidden print:bg-white fixed w-full -z-20 top-0 min-h-full size-230 h-screen bg-radial-[at_-10%_-80%] from-20% from-[var(--gold-700)] via-50% via-stone-700	 to-zinc-900 to-110%" />

			<div className="print:hidden">
				<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
			</div>

			{/* Main content */}
			<main
				className={cn(
					` ml-64 mr-0 transition-all w-[82vw] duration-300 print:ml-0 print:w-full print:bg-white`,
					isCollapsed && "ml-18 pl-0 w-[95vw]  overflow-hidden"
				)}>
				{/* Header */}
				<header className="print:hidden sticky top-0 z-20 border-b border-sidebar-border bg-chart-1 shadow-lg shadow-black/5 backdrop-blur-sm">
					<div className="flex h-20 items-center justify-between px-8">
						<div>
							{title && (
								<h1 className="text-xl font-bold bg-linear-to-br from-0% from-primary to-50% to-amber-200 text-shadow-sm text-shadow-black/10  bg-clip-text text-transparent">
									{title}
								</h1>
							)}
							{description && (
								<p className="text-sm text-muted-foreground mt-1">{description}</p>
							)}
						</div>

						<div className="flex items-center gap-3">
							{actions}
							<NotificationsPanel
								notifications={notifications}
								onMarkAllRead={async () => {
									try {
										await fetch("/api/notifications/mark-all-read", {
											method: "POST",
										});
										router.refresh();
									} catch (e) {
										console.error("Failed to mark all read", e);
									}
								}}
								onAction={async (notification, action) => {
									try {
										if (action === "view") {
											// Navigate first — push loads fresh server data
											router.push(getNotificationRoute(notification));
										}

										if (action === "retry" || action === "cancel") {
											await fetch(
												`/api/workflows/${notification.workflowId}/resolve-error`,
												{
													method: "POST",
													body: JSON.stringify({ action }),
													headers: { "Content-Type": "application/json" },
												}
											);
										}

										// Mark notification as read in background
										fetch(`/api/notifications/${notification.id}`, {
											method: "PATCH",
										}).catch(e => console.error("Failed to mark notification read", e));

										// Only refresh when not navigating away (retry/cancel stay on same page)
										if (action !== "view") {
											router.refresh();
										}
									} catch (e) {
										console.error("Action failed", e);
									}
								}}
								onNotificationClick={notification => {
									const route = getNotificationRoute(notification);
									// Navigate immediately — router.push loads fresh server data,
									// no need to call router.refresh() after push.
									router.push(route);
									// Fire PATCH in background without blocking navigation
									fetch(`/api/notifications/${notification.id}`, {
										method: "PATCH",
									}).catch(e => {
										console.error("Failed to mark notification as read", e);
									});
								}}
								onDelete={async notification => {
									try {
										await fetch(`/api/notifications/${notification.id}`, {
											method: "DELETE",
										});
										router.refresh();
									} catch (e) {
										console.error("Delete failed", e);
									}
								}}
							/>
							{isMounted && (
								<div suppressHydrationWarning>
									<UserButton />
								</div>
							)}
						</div>
					</div>
				</header>

				{/* Page content */}
				<div className="p-8 print:bg-white">{children}</div>
			</main>
		</>
	);
}
