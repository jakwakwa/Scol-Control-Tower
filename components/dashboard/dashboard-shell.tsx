"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
import { getNotificationRoute } from "@/lib/notifications/semantics";
import { cn } from "@/lib/utils";
import { NotificationsPanel, type WorkflowNotification } from "./notifications-panel";
import { Sidebar } from "./sidebar";

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

		eventSource.onmessage = event => {
			try {
				const data = JSON.parse(event.data);
				if (data && (data.type === "notification" || data.type === "update")) {
					router.refresh();
				}
			} catch (e) {
				console.error("Failed to parse notification event", e);
			}
		};

		eventSource.onerror = error => {
			console.error("EventSource failed", error);
			// EventSource automatically reconnects
		};

		return () => {
			eventSource.close();
		};
	}, [router]);

	return (
		<>
			{/* BACKGROUNDs */}
			<div className="fixed w-full -z-20 top-0 min-h-full size-230 h-screen bg-radial-[at_-30%_-40%] from-10% from-[var(--gold-700)]/80 via-65% via-zinc-800/90	 to-zinc-900/90 to-110%" />

			<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

			{/* Main content */}
			<main
				className={cn(
					` ml-64 mr-0 transition-all w-[82vw] duration-300`,
					isCollapsed && "ml-18 pl-0 w-[95vw]  overflow-hidden"
				)}>
				{/* Header */}
				<header className="sticky top-0 z-20 border-b border-sidebar-border bg-chart-1 shadow-lg shadow-black/5 backdrop-blur-sm">
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
				<div className="p-8">{children}</div>
			</main>
		</>
	);
}
