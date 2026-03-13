import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
	addController,
	removeController,
} from "../lib/notification-broadcaster";

const insertReturningMock = mock(async () => [{ id: 123 }]);

const fakeDatabaseClient = {
	insert: () => ({
		values: () => ({
			returning: insertReturningMock,
		}),
	}),
};

mock.module("@/app/utils", () => ({
	getDatabaseClient: () => fakeDatabaseClient,
}));

const { createWorkflowNotification } = await import(
	"../lib/services/notification-events.service"
);

type TestController = ReadableStreamDefaultController<Uint8Array>;
const registeredControllers: TestController[] = [];

function registerController(
	enqueue: (chunk: Uint8Array) => void
): TestController {
	const controller = { enqueue } as TestController;
	addController(controller);
	registeredControllers.push(controller);
	return controller;
}

async function flushMicrotasks() {
	await Promise.resolve();
}

describe("createWorkflowNotification", () => {
	beforeEach(() => {
		insertReturningMock.mockReset();
		insertReturningMock.mockResolvedValue([{ id: 123 }]);
	});

	afterEach(async () => {
		await flushMicrotasks();
		for (const controller of registeredControllers) {
			removeController(controller);
		}
		registeredControllers.length = 0;
	});

	it("returns control immediately before any enqueue runs", async () => {
		let enqueueCalls = 0;
		registerController(() => {
			enqueueCalls += 1;
		});

		const createPromise = createWorkflowNotification({
			workflowId: 1,
			applicantId: 10,
			type: "info",
			title: "Created",
			message: "Notification inserted",
			severity: "high",
		});

		expect(enqueueCalls).toBe(0);
		await createPromise;
		expect(insertReturningMock).toHaveBeenCalledTimes(1);
		expect(enqueueCalls).toBe(1);
	});

	it("delivers notification payload to connected SSE controllers", async () => {
		let payload: Uint8Array | undefined;
		registerController((chunk) => {
			payload = chunk;
		});

		await createWorkflowNotification({
			workflowId: 2,
			applicantId: 20,
			type: "success",
			title: "Inserted",
			message: "Send to stream",
			severity: "high",
		});

		const decodedPayload = new TextDecoder().decode(payload);
		expect(decodedPayload).toBe(
			'data: {"type":"notification","notificationId":123}\n\n'
		);
	});

	it("handles many clients without failing notification creation", async () => {
		const healthyCalls = new Array(200).fill(0);

		for (let index = 0; index < healthyCalls.length; index += 1) {
			registerController(() => {
				healthyCalls[index] += 1;
			});
		}

		for (let index = 0; index < 50; index += 1) {
			registerController(() => {
				throw new Error(`closed-${index}`);
			});
		}

		await expect(
			createWorkflowNotification({
				workflowId: 3,
				applicantId: 30,
				type: "warning",
				title: "Bulk fan-out",
				message: "Many listeners",
				severity: "high",
			})
		).resolves.toBeUndefined();

		expect(insertReturningMock).toHaveBeenCalledTimes(1);
		for (const count of healthyCalls) {
			expect(count).toBe(1);
		}
	});
});
