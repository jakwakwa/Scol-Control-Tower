import { NextRequest } from 'next/server';
import { addController, removeController } from '@/lib/notification-broadcaster';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      addController(controller);

      // Send a keep-alive comment every 15 seconds to prevent proxy timeouts
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch (e) {
          clearInterval(keepAliveInterval);
        }
      }, 15000);

      // Cleanup when the request is aborted (client disconnects)
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        removeController(controller);
        controller.close();
      });
    },
    cancel() {
      // This is called if the stream is cancelled; cleanup will also happen via abort
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // For nginx
    },
  });
}
