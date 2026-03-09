const controllers = new Set<ReadableStreamDefaultController<Uint8Array>>();

export function addController(controller: ReadableStreamDefaultController<Uint8Array>) {
  controllers.add(controller);
}

export function removeController(controller: ReadableStreamDefaultController<Uint8Array>) {
  controllers.delete(controller);
}

export async function broadcast(event: { type: string; notificationId?: number }) {
  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const controller of controllers) {
    try {
      controller.enqueue(encoder.encode(data));
    } catch (e) {
      // If enqueue fails (e.g., closed), remove the controller
      controllers.delete(controller);
    }
  }
}
