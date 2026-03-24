"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import Grainient from "../Grainient";
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
			<div style={{ width: "100vw", height: "1080px", position: "fixed", zIndex: "-2" }}>
				<Grainient
					// color1="#192d36"
					// color2="#21354a"
					color3="#28272b"
					color1="#192d36"
					color2="#21354a"
					// color3="#404b4d"
					timeSpeed={0.3}
					colorBalance={-0.5}
					warpStrength={2}
					warpFrequency={1}
					warpSpeed={0.2}
					warpAmplitude={50}
					blendAngle={1}
					blendSoftness={0.9}
					rotationAmount={310}
					noiseScale={2.45}
					grainAmount={0.09}
					grainScale={1}
					grainAnimated={false}
					contrast={1.2}
					gamma={1.05}
					saturation={0.7}
					centerX={-0.2}
					centerY={-3}
					zoom={2.2}
				/>
			</div>

			<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

			{/* Main content */}
			<main className={cn(`pl-64 transition-all duration-300`, isCollapsed && "pl-20")}>
				{/* Header */}
				<header className="sticky top-0 z-30 border-b border-sidebar-border bg-transparent backdrop-blur-lg">
					<div className="flex h-20 items-center justify-between px-8">
						<div>
							{title && (
								<h1 className="text-xl font-bold bg-linear-to-r from-chart-5 to-muted-foreground bg-clip-text text-transparent">
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
		</>
	);
}
