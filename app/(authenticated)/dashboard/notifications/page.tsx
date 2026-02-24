import {
	RiAlertLine,
	RiCheckDoubleLine,
	RiCheckLine,
	RiDeleteBinLine,
	RiTimeLine,
} from "@remixicon/react";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/app/utils";
import { DashboardLayout, DashboardSection, GlassCard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { applicants, notifications, workflows } from "@/db/schema";

async function markAsRead(formData: FormData) {
	"use server";
	const id = formData.get("id");
	if (!id) return;

	const db = getDatabaseClient();
	if (!db) return;

	await db
		.update(notifications)
		.set({ read: true })
		.where(eq(notifications.id, parseInt(id.toString())));

	revalidatePath("/dashboard/notifications");
}

async function deleteNotification(formData: FormData) {
	"use server";
	const id = formData.get("id");
	if (!id) return;

	const db = getDatabaseClient();
	if (!db) return;

	await db.delete(notifications).where(eq(notifications.id, parseInt(id.toString())));

	revalidatePath("/dashboard/notifications");
}

async function clearAllNotifications() {
	"use server";

	const db = getDatabaseClient();
	if (!db) return;

	await db.delete(notifications);

	revalidatePath("/dashboard/notifications");
}

async function markAllAsRead() {
	"use server";

	const db = getDatabaseClient();
	if (!db) return;

	await db.update(notifications).set({ read: true });

	revalidatePath("/dashboard/notifications");
}

const MANUAL_PROCUREMENT_ALERT_TERMS = [
	"manual procurement check required",
	"procurement_check_failed",
	"procurecheck failed",
	"procurement check failed",
];

function isManualProcurementNotification(message: string): boolean {
	const normalized = message.toLowerCase();
	return MANUAL_PROCUREMENT_ALERT_TERMS.some(term => normalized.includes(term));
}

function formatNotificationMessage(message: string): string {
	if (!isManualProcurementNotification(message)) {
		return message;
	}
	return "Automated procurement checks failed. Complete a full manual procurement check in Risk Review and record the procurement decision.";
}

export default async function NotificationsPage() {
	const db = getDatabaseClient();
	let allNotifications: any[] = [];

	if (db) {
		try {
			const result = await db
				.select({
					id: notifications.id,
					workflowId: notifications.workflowId,
					type: notifications.type,
					message: notifications.message,
					read: notifications.read,
					actionable: notifications.actionable,
					createdAt: notifications.createdAt,
					clientName: applicants.companyName,
				})
				.from(notifications)
				.leftJoin(workflows, eq(notifications.workflowId, workflows.id))
				.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
				.orderBy(desc(notifications.createdAt));

			allNotifications = result;
		} catch (error) {
			console.error("Failed to fetch notifications:", error);
		}
	}

	const unreadCount = allNotifications.filter(n => !n.read).length;

	return (
		<DashboardLayout
			title="Notifications"
			description={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
			actions={
				<div className="flex gap-2">
					<form action={markAllAsRead}>
						<Button variant="outline" size="sm" className="gap-2">
							<RiCheckDoubleLine className="h-4 w-4" />
							Mark All Read
						</Button>
					</form>
					<form action={clearAllNotifications}>
						<Button
							variant="outline"
							size="sm"
							className="gap-2 text-red-400 hover:text-red-300">
							<RiDeleteBinLine className="h-4 w-4" />
							Clear All
						</Button>
					</form>
				</div>
			}>
			<DashboardSection title="All Notifications">
				{allNotifications.length === 0 ? (
					<GlassCard>
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<RiCheckDoubleLine className="h-12 w-12 mb-4 opacity-30" />
							<p>No notifications</p>
						</div>
					</GlassCard>
				) : (
					<div className="space-y-3">
						{allNotifications.map(notification => (
							<GlassCard
								key={notification.id}
								className={`flex items-start justify-between gap-4 ${
									!notification.read ? "border-l-4 border-l-warning" : ""
								}`}>
								<div className="flex items-start gap-4">
									<div
										className={`p-2 rounded-lg ${
											notification.type === "error"
												? "bg-red-500/10 text-red-400"
												: notification.type === "warning"
													? "bg-warning/50 text-warning-foreground"
													: notification.type === "success"
														? "bg-green-500/10 text-green-400"
														: "bg-blue-500/10 text-blue-400"
										}`}>
										{notification.type === "error" ? (
											<RiAlertLine className="h-5 w-5" />
										) : notification.type === "warning" ? (
											<RiTimeLine className="h-5 w-5" />
										) : (
											<RiCheckLine className="h-5 w-5" />
										)}
									</div>
									<div>
										<h4 className="font-medium flex items-center gap-2">
											{notification.clientName || "Unknown Client"}
											{isManualProcurementNotification(notification.message) && (
												<span className="text-[10px] uppercase tracking-wide text-red-300 border border-red-500/30 bg-red-500/10 rounded px-1.5 py-0.5">
													Manual Check
												</span>
											)}
											{!notification.read && (
												<span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-400" />
											)}
										</h4>
										<p className="text-sm text-muted-foreground">
											{formatNotificationMessage(notification.message)}
										</p>
										<p className="text-xs text-muted-foreground/60 mt-1">
											{notification.createdAt
												? new Date(notification.createdAt).toLocaleString()
												: "Unknown time"}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-2">
									{!notification.read && (
										<form action={markAsRead}>
											<input type="hidden" name="id" value={notification.id} />
											<Button variant="ghost" size="sm" className="gap-1">
												<RiCheckLine className="h-4 w-4" />
												Mark Read
											</Button>
										</form>
									)}
									<form action={deleteNotification}>
										<input type="hidden" name="id" value={notification.id} />
										<Button
											variant="ghost"
											size="sm"
											className="gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10">
											<RiDeleteBinLine className="h-4 w-4" />
										</Button>
									</form>
								</div>
							</GlassCard>
						))}
					</div>
				)}
			</DashboardSection>
		</DashboardLayout>
	);
}
