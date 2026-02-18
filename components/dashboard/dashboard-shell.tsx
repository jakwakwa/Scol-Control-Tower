"use client";

import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
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

	const { title, description, actions } = useDashboardStore();

	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<div className="min-h-screen bg-linear-to-br from-background via-background/50 to-background/10 ">
			<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

			{/* Main content */}
			<main className={cn(`pl-64 transition-all duration-300`, isCollapsed && "pl-20")}>
				{/* Header */}
				<header className="sticky top-0 z-30 border-b border-sidebar-border bg-transparent backdrop-blur-lg">
					<div className="flex h-20 items-center justify-between px-8">
						<div>
							{title && (
								<h1 className="text-xl font-bold bg-linear-to-r from-primary to-muted bg-clip-text text-transparent">
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
											const isQuote = notification.message
												.toLowerCase()
												.includes("quote");
											const route = isQuote
												? `/dashboard/applicants/${notification.applicantId}?tab=reviews`
												: `/dashboard/applicants/${notification.applicantId}`;
											router.push(route);
										}

										if (action === "retry" || action === "cancel") {
											// Call resolve-error API for workflow actions
											await fetch(
												`/api/workflows/${notification.workflowId}/resolve-error`,
												{
													method: "POST",
													body: JSON.stringify({ action }),
													headers: { "Content-Type": "application/json" },
												}
											);
										}

										// Mark notification as read
										await fetch(`/api/notifications/${notification.id}`, {
											method: "PATCH",
										});

										router.refresh();
									} catch (e) {
										console.error("Action failed", e);
									}
								}}
								onNotificationClick={async notification => {
									try {
										const isQuote = notification.message.toLowerCase().includes("quote");
										const route = isQuote
											? `/dashboard/applicants/${notification.applicantId}?tab=reviews`
											: `/dashboard/applicants/${notification.applicantId}`;
										router.push(route);

										// Mark notification as read
										await fetch(`/api/notifications/${notification.id}`, {
											method: "PATCH",
										});

										router.refresh();
									} catch (e) {
										console.error("Click handler failed", e);
									}
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
		</div>
	);
}
