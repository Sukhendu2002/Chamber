import { auth } from "@clerk/nextjs/server";

// Store active connections per user
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

export function notifyUser(userId: string) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    const data = `data: ${JSON.stringify({ type: "expense_added", timestamp: Date.now() })}\n\n`;
    userConnections.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(data));
      } catch {
        // Connection closed, will be cleaned up
      }
    });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the user's set
      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }
      connections.get(userId)!.add(controller);

      // Send initial connection message
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      return () => {
        clearInterval(heartbeat);
        connections.get(userId)?.delete(controller);
        if (connections.get(userId)?.size === 0) {
          connections.delete(userId);
        }
      };
    },
    cancel() {
      // Connection closed by client
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
