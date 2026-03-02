"use client";

import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import { NotificationsPanel, type WorkflowNotification } from "./notifications-panel";
import { Sidebar } from "./sidebar";

interface DashboardShellProps {
	children: React.ReactNode;
	notifications?: WorkflowNotification[];
}

const getNotificationRoute = (notification: WorkflowNotification): string => {
	const message = notification.message.toLowerCase();
	const isPreRiskReview =
		message.includes("pre-risk") || message.includes("sales evaluation");
	const isQuoteReview =
		message.includes("quote ready for review") ||
		message.includes("overlimit: quote requires special approval") ||
		message.includes("quotation");
	const isProcurementManualCheck =
		message.includes("manual procurement check required") ||
		message.includes("procurement_check_failed") ||
		message.includes("procurecheck failed") ||
		message.includes("procurement review required");
	const isSanctionsManualCheck =
		message.includes("manual sanctions check required") ||
		message.includes("sanctions_check_failed") ||
		message.includes("automated sanctions checks failed");

	if (isProcurementManualCheck || isSanctionsManualCheck) {
		return "/dashboard/risk-review";
	}

	if (isPreRiskReview || isQuoteReview) {
		return `/dashboard/applicants/${notification.applicantId}?tab=reviews`;
	}

	return `/dashboard/applicants/${notification.applicantId}`;
};

export function DashboardShell({ children, notifications = [] }: DashboardShellProps) {
	const router = useRouter();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	const { title, description, actions } = useDashboardStore();

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Auto-refresh notifications every 30 seconds (paused when tab is hidden)
	const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		const startPolling = () => {
			if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
			refreshIntervalRef.current = setInterval(() => {
				if (!document.hidden) {
					router.refresh();
				}
			}, 30_000);
		};

		startPolling();

		const handleVisibility = () => {
			if (!document.hidden) {
				router.refresh();
				startPolling();
			}
		};

		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
			}
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [router]);

	return (
		<div className="min-h-screen dotted-grid-main">
			{/* <svg
				aria-hidden="true"
				className="pointer-events-none absolute h-0 w-0 overflow-hidden"
				focusable="false">
				<defs>
					<filter id="container-glass" x="0%" y="0%" width="100%" height="100%">
						<feTurbulence
							type="fractalNoise"
							baseFrequency="0.008 0.008"
							numOctaves="2"
							seed="92"
							result="noise"
						/>
						<feGaussianBlur in="noise" stdDeviation="0.02" result="blur" />
						<feDisplacementMap
							in="SourceGraphic"
							in2="blur"
							scale="77"
							xChannelSelector="R"
							yChannelSelector="G"
						/>
					</filter>
					<filter id="btn-glass" primitiveUnits="objectBoundingBox">
						<feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />
						<feDisplacementMap
							id="disp"
							in="blur"
							in2="blur"
							scale="1"
							xChannelSelector="R"
							yChannelSelector="G"
						/>
					</filter>
				</defs>
			</svg> */}
			<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

			{/* Main content */}
			<main className={cn(`pl-64 transition-all duration-300`, isCollapsed && "pl-20")}>
				{/* Header */}
				<header className="sticky top-0 z-30 border-b border-sidebar-border bg-transparent backdrop-blur-lg">
					<div className="flex h-20 items-center justify-between px-8">
						<div>
							{title && (
								<h1 className="text-xl font-bold bg-linear-to-r from-secondary to-muted bg-clip-text text-transparent">
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
											router.push(getNotificationRoute(notification));
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
										router.push(getNotificationRoute(notification));

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
