import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTelegramStatus } from "@/lib/actions/settings";
import { TelegramLinkingForm } from "@/components/telegram-linking-form";

export default async function TelegramPage() {
  const status = await getTelegramStatus();

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold">Telegram</h1>
        <p className="text-sm text-muted-foreground">
          Link your Telegram account to track expenses on the go
        </p>
      </div>

      <TelegramLinkingForm isLinked={status.isLinked} />

      {/* Usage Guide */}
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="mb-2 text-sm font-medium">Text Messages</p>
            <p className="text-sm text-muted-foreground">
              Send &quot;Lunch 450&quot; and AI will extract:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Amount: ₹450</li>
              <li>• Category: Food</li>
              <li>• Description: Lunch</li>
            </ul>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="mb-2 text-sm font-medium">Receipt Photos</p>
            <p className="text-sm text-muted-foreground">
              Send a photo of your receipt and AI will automatically extract the
              merchant, amount, and date.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
