const controllers = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

export function addController(controller: ReadableStreamDefaultController<Uint8Array>) {
	controllers.add(controller);
}

export function removeController(
	controller: ReadableStreamDefaultController<Uint8Array>
) {
	controllers.delete(controller);
}

export function broadcast(event: { type: string; notificationId?: number }) {
	const data = `data: ${JSON.stringify(event)}\n\n`;
	const encoded = encoder.encode(data);
	const fanOutTargets = Array.from(controllers);

	queueMicrotask(() => {
		for (const controller of fanOutTargets) {
			try {
				controller.enqueue(encoded);
			} catch (_e) {
				// If enqueue fails (e.g., closed), remove the controller
				controllers.delete(controller);
			}
		}
	});
}