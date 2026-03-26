import { getDatabaseClient } from "@/app/utils";
import { notifications, workflows, applicants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { WorkflowNotification } from "@/components/dashboard/notifications-panel";
import { isNotificationType } from "@/lib/notifications/types";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

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
			}));
		} catch (error) {
			console.error("Failed to fetch notifications:", error);
		}
	}

	return (
		<DashboardShell notifications={workflowNotifications}>{children}</DashboardShell>
	);
}
