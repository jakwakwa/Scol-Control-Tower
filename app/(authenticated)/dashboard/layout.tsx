import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDatabaseClient } from "@/app/utils";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";
import { applicants, notifications, workflows } from "@/db/schema";
import { isNotificationType } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { userId } = await auth();

	if (!userId) {
		redirect("/sign-in");
	}

	const db = getDatabaseClient();
	let workflowNotifications: WorkflowNotification[] = [];

	if (db) {
		try {
			const notificationsResult = await db
				.select({
					id: notifications.id,
					workflowId: notifications.workflowId,
					applicantId: notifications.applicantId,
					type: notifications.type,
					message: notifications.message,
					read: notifications.read,
					actionable: notifications.actionable,
					createdAt: notifications.createdAt,
					sourceEventType: notifications.sourceEventType,
					clientName: applicants.companyName,
				})
				.from(notifications)
				.leftJoin(workflows, eq(notifications.workflowId, workflows.id))
				.leftJoin(applicants, eq(workflows.applicantId, applicants.id))
				.orderBy(desc(notifications.createdAt))
				.limit(20);

			workflowNotifications = notificationsResult.map(n => ({
				id: n.id.toString(),
				workflowId: n.workflowId || 0,
				applicantId: n.applicantId || 0,
				clientName: n.clientName || "Unknown",
				type: isNotificationType(n.type) ? n.type : ("info" as const),
				message: n.message,
				timestamp: n.createdAt,
				read: n.read,
				actionable: n.actionable,
				sourceEventType: n.sourceEventType,
			}));
		} catch (error) {
			console.error("Failed to fetch notifications:", error);
		}
	}

	return (
		<DashboardShell notifications={workflowNotifications}>{children}</DashboardShell>
	);
}
