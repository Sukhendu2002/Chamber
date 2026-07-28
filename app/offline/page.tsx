import Link from "next/link";
import { IconCloudOff, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center border bg-muted">
            <IconCloudOff aria-hidden="true" className="size-6" />
          </div>
          <CardTitle className="text-xl">Chamber is offline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reconnect to parse a screenshot or save an expense. Your Android share can be
            retried once you are online.
          </p>
          <Button asChild className="min-h-11 w-full">
            <Link href="/capture">
              <IconRefresh aria-hidden="true" />
              Try again
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
