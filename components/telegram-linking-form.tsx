"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconBrandTelegram,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconUnlink,
} from "@tabler/icons-react";
import { generateLinkingCode, unlinkTelegram } from "@/lib/actions/settings";

type TelegramLinkingFormProps = {
  isLinked: boolean;
};

export function TelegramLinkingForm({ isLinked: initialIsLinked }: TelegramLinkingFormProps) {
  const [isLinked, setIsLinked] = useState(initialIsLinked);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLinked && !linkingCode) {
      handleGenerateCode();
    }
  }, [isLinked, linkingCode]);

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const result = await generateLinkingCode();
      setLinkingCode(result.code);
    } catch (error) {
      console.error("Failed to generate code:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (linkingCode) {
      navigator.clipboard.writeText(`/start ${linkingCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      await unlinkTelegram();
      setIsLinked(false);
      handleGenerateCode();
    } catch (error) {
      console.error("Failed to unlink:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Connection Status */}
      <Card className="mb-6 border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Connection Status
            </CardTitle>
            <Badge variant={isLinked ? "default" : "secondary"}>
              {isLinked ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLinked ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <IconBrandTelegram className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Telegram Linked</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is connected
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={loading}
              >
                <IconUnlink className="mr-2 h-4 w-4" />
                Unlink
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your Telegram account is not linked. Follow the steps below to
              connect.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Linking Instructions */}
      {!isLinked && (
        <Card className="mb-6 border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Link Your Telegram Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                1
              </div>
              <div>
                <p className="font-medium">Open Telegram</p>
                <p className="text-sm text-muted-foreground">
                  Search for <span className="font-mono">@ChamberExpenseBot</span>{" "}
                  or click the button below
                </p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a
                    href="https://t.me/ChamberExpenseBot"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconBrandTelegram className="mr-2 h-4 w-4" />
                    Open in Telegram
                  </a>
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">Send the linking code</p>
                <p className="mb-3 text-sm text-muted-foreground">
                  Copy and send this command to the bot
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-md border bg-muted px-3 py-2">
                    <code className="flex-1 text-sm font-mono">
                      /start {linkingCode || "..."}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    disabled={!linkingCode}
                  >
                    {copied ? (
                      <IconCheck className="h-4 w-4" />
                    ) : (
                      <IconCopy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateCode}
                    disabled={loading}
                  >
                    <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Code expires in 10 minutes
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium text-muted-foreground">
                  Start tracking
                </p>
                <p className="text-sm text-muted-foreground">
                  Once linked, send messages like &quot;Lunch 450&quot; to track
                  expenses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
