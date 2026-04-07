import { z } from "zod";
import {
	authenticate,
	getProcureCheckRuntimeConfig,
	withProcureCheckProxy,
} from "./client";

// ============================================
// Schemas
// ============================================

const NotificationSchema = z.object({
	Id: z.string().optional(),
	Message: z.string().optional(),
	CreationTime: z.string().optional(),
	IsRead: z.boolean().optional(),
});

const NotificationListResponseSchema = z.object({
	Data: z.array(NotificationSchema).optional().default([]),
	TotalRecords: z.number().optional().default(0),
});

export type ProcureCheckNotification = z.infer<typeof NotificationSchema>;

export interface NotificationListResult {
	notifications: ProcureCheckNotification[];
	totalRecords: number;
}

// ============================================
// getUnreadNotifications()
// ============================================

/**
 * Fetch unread notifications from ProcureCheck V7 notifications API.
 * IsActive=false returns unread notifications.
 */
export async function getUnreadNotifications(opts?: {
	messageFilter?: string;
	pageSize?: number;
}): Promise<NotificationListResult> {
	const token = await authenticate();
	const { baseUrl } = getProcureCheckRuntimeConfig();
	const url = `${baseUrl}notifications/getlist`;

	const body = {
		QueryParams: {
			Conditions: [
				{
					ColumnName: "Message",
					Operator: "Contains",
					Value: opts?.messageFilter ?? "",
				},
			],
			PageSize: opts?.pageSize ?? 100,
			SortColumn: "CreationTime",
			SortOrder: "Descending",
		},
		IsActive: false,
	};

	const response = await fetch(
		url,
		withProcureCheckProxy({
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(body),
		}),
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`ProcureCheck notifications fetch failed (POST ${url}): ${response.status} ${errorText}`,
		);
	}

	const data = await response.json();
	const parsed = NotificationListResponseSchema.parse(data);

	return {
		notifications: parsed.Data,
		totalRecords: parsed.TotalRecords,
	};
}

/**
 * Check if there's a completion notification for a specific vendor.
 * Searches notification messages for the vendor name or ID.
 */
export async function hasCompletionNotification(
	vendorNameOrId: string,
): Promise<boolean> {
	const result = await getUnreadNotifications({
		messageFilter: vendorNameOrId,
	});
	return result.notifications.length > 0;
}
