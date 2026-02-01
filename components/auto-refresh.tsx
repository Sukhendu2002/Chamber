"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "expense_added") {
          router.refresh();
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // Reconnect will happen automatically
      eventSource.close();
      // Retry connection after 5 seconds
      setTimeout(() => {
        router.refresh(); // Fallback refresh on reconnect
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  return null;
}
