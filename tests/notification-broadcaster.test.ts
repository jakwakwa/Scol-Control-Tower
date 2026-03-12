import { afterEach, describe, expect, it } from "bun:test";
import {
	addController,
	broadcast,
	removeController,
} from "../lib/notification-broadcaster";

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

afterEach(async () => {
	await flushMicrotasks();
	for (const controller of registeredControllers) {
		removeController(controller);
	}
	registeredControllers.length = 0;
});

describe("notification-broadcaster", () => {
	it("defers enqueue work to a microtask", async () => {
		let enqueueCalls = 0;
		registerController(() => {
			enqueueCalls += 1;
		});

		broadcast({ type: "notification", notificationId: 10 });
		expect(enqueueCalls).toBe(0);

		await flushMicrotasks();
		expect(enqueueCalls).toBe(1);
	});

	it("fans out encoded SSE payload to all connected controllers", async () => {
		let firstPayload: Uint8Array | undefined;
		let secondPayload: Uint8Array | undefined;

		registerController((chunk) => {
			firstPayload = chunk;
		});
		registerController((chunk) => {
			secondPayload = chunk;
		});

		broadcast({ type: "update", notificationId: 42 });
		await flushMicrotasks();

		const decoder = new TextDecoder();
		expect(decoder.decode(firstPayload)).toBe(
			'data: {"type":"update","notificationId":42}\n\n'
		);
		expect(decoder.decode(secondPayload)).toBe(
			'data: {"type":"update","notificationId":42}\n\n'
		);
	});

	it("removes controllers that throw during enqueue", async () => {
		let throwingControllerCalls = 0;
		let healthyControllerCalls = 0;

		registerController(() => {
			throwingControllerCalls += 1;
			throw new Error("stream closed");
		});
		registerController(() => {
			healthyControllerCalls += 1;
		});

		broadcast({ type: "notification", notificationId: 1 });
		await flushMicrotasks();

		broadcast({ type: "notification", notificationId: 2 });
		await flushMicrotasks();

		expect(throwingControllerCalls).toBe(1);
		expect(healthyControllerCalls).toBe(2);
	});

	it("does not include late joiners in an already-queued fan-out", async () => {
		let initialControllerCalls = 0;
		let lateJoinerCalls = 0;

		registerController(() => {
			initialControllerCalls += 1;
		});

		broadcast({ type: "notification", notificationId: 99 });

		registerController(() => {
			lateJoinerCalls += 1;
		});

		await flushMicrotasks();

		expect(initialControllerCalls).toBe(1);
		expect(lateJoinerCalls).toBe(0);
	});

	it("is a no-op when there are no connected controllers", async () => {
		expect(() => {
			broadcast({ type: "notification", notificationId: 5 });
		}).not.toThrow();

		await flushMicrotasks();
	});

	it("keeps call-site latency low with many connected clients", async () => {
		const enqueueCalls = new Array(500).fill(0);

		for (let index = 0; index < enqueueCalls.length; index += 1) {
			registerController(() => {
				enqueueCalls[index] += 1;
			});
		}

		broadcast({ type: "notification", notificationId: 777 });
		expect(enqueueCalls.every((count) => count === 0)).toBe(true);

		await flushMicrotasks();
		expect(enqueueCalls.every((count) => count === 1)).toBe(true);
	});
});
