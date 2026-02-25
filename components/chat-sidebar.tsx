"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createExpense } from "@/lib/actions/expenses";
import { getAccounts } from "@/lib/actions/accounts";
import {
    IconMessageCircle,
    IconX,
    IconSend,
    IconPaperclip,
    IconPhoto,
    IconFileText,
    IconCheck,
    IconLoader2,
    IconAlertCircle,
    IconReceipt,
} from "@tabler/icons-react";

// Message types
type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    attachment?: {
        type: "image" | "pdf";
        name: string;
        preview?: string; // base64 data URL for image preview
    };
    parsedExpense?: {
        amount: number;
        category: string;
        description: string;
        merchant?: string;
        confidence: number;
        receiptUrl?: string;
    };
    status?: "sending" | "parsing" | "confirm" | "saved" | "error";
    errorMessage?: string;
};

type Account = {
    id: string;
    name: string;
    type: string;
};

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
    BANK: "🏦",
    INVESTMENT: "📈",
    WALLET: "💳",
    CASH: "💵",
    CREDIT_CARD: "💳",
    DEBIT_CARD: "💳",
    OTHER: "💰",
};

function generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function ChatSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [accountsLoaded, setAccountsLoaded] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load accounts when sidebar opens
    useEffect(() => {
        if (isOpen && !accountsLoaded) {
            getAccounts()
                .then((accs) => {
                    setAccounts(accs.map((a) => ({ id: a.id, name: a.name, type: a.type })));
                    setAccountsLoaded(true);
                })
                .catch(console.error);
        }
    }, [isOpen, accountsLoaded]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [isOpen]);

    const updateMessage = useCallback((id: string, update: Partial<ChatMessage>) => {
        setMessages((prev) =>
            prev.map((msg) => (msg.id === id ? { ...msg, ...update } : msg))
        );
    }, []);

    // Send text message
    const handleSend = async () => {
        const text = input.trim();
        if (!text || isSending) return;

        const userMsgId = generateId();
        const assistantMsgId = generateId();

        // Add user message
        setMessages((prev) => [
            ...prev,
            {
                id: userMsgId,
                role: "user",
                content: text,
                timestamp: new Date(),
            },
            {
                id: assistantMsgId,
                role: "assistant",
                content: "🤖 Parsing...",
                timestamp: new Date(),
                status: "parsing",
            },
        ]);
        setInput("");
        setIsSending(true);

        try {
            const response = await fetch("/api/chat/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "text", text }),
            });

            const result = await response.json();

            if (result.success && result.expense) {
                const exp = result.expense;
                updateMessage(assistantMsgId, {
                    content: `💰 ₹${exp.amount.toFixed(2)}\n📁 ${exp.category}\n📝 ${exp.description}${exp.merchant ? `\n🏪 ${exp.merchant}` : ""}`,
                    parsedExpense: exp,
                    status: "confirm",
                });
            } else {
                updateMessage(assistantMsgId, {
                    content: `❓ ${result.error || "Could not parse expense"}. Try: "Lunch 450"`,
                    status: "error",
                    errorMessage: result.error,
                });
            }
        } catch {
            updateMessage(assistantMsgId, {
                content: "❌ Failed to process. Please try again.",
                status: "error",
            });
        }

        setIsSending(false);
    };

    // Handle file upload (image or PDF)
    const handleFileUpload = async (file: File) => {
        if (isSending) return;

        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";

        if (!isImage && !isPdf) {
            setMessages((prev) => [
                ...prev,
                {
                    id: generateId(),
                    role: "assistant",
                    content: "❌ Only images and PDFs are supported.",
                    timestamp: new Date(),
                    status: "error",
                },
            ]);
            return;
        }

        // Read file as base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        // Create preview for images
        let preview: string | undefined;
        if (isImage) {
            preview = `data:${file.type};base64,${base64}`;
        }

        const userMsgId = generateId();
        const assistantMsgId = generateId();

        setMessages((prev) => [
            ...prev,
            {
                id: userMsgId,
                role: "user",
                content: isImage ? "📷 Receipt image" : "📄 PDF document",
                timestamp: new Date(),
                attachment: {
                    type: isImage ? "image" : "pdf",
                    name: file.name,
                    preview,
                },
            },
            {
                id: assistantMsgId,
                role: "assistant",
                content: "🤖 Analyzing with AI vision...",
                timestamp: new Date(),
                status: "parsing",
            },
        ]);

        setIsSending(true);

        try {
            const response = await fetch("/api/chat/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: isPdf ? "pdf" : "image",
                    imageBase64: base64,
                    mimeType: file.type,
                }),
            });

            const result = await response.json();

            if (result.success && result.expense) {
                const exp = result.expense;
                updateMessage(assistantMsgId, {
                    content: `💰 ₹${exp.amount.toFixed(2)}\n📁 ${exp.category}\n📝 ${exp.description}${exp.merchant ? `\n🏪 ${exp.merchant}` : ""}`,
                    parsedExpense: { ...exp, receiptUrl: result.receiptUrl },
                    status: "confirm",
                });
            } else {
                updateMessage(assistantMsgId, {
                    content: `❓ ${result.error || "Could not parse"}. Try adding a text description instead.`,
                    status: "error",
                    errorMessage: result.error,
                });
            }
        } catch {
            updateMessage(assistantMsgId, {
                content: "❌ Failed to process file. Please try again.",
                status: "error",
            });
        }

        setIsSending(false);
    };

    // Save expense with selected account
    const handleSaveExpense = async (messageId: string, accountId: string) => {
        const msg = messages.find((m) => m.id === messageId);
        if (!msg?.parsedExpense) return;

        const account = accounts.find((a) => a.id === accountId);
        if (!account) return;

        updateMessage(messageId, { status: "sending" });

        try {
            await createExpense({
                amount: msg.parsedExpense.amount,
                category: msg.parsedExpense.category,
                description: msg.parsedExpense.description,
                merchant: msg.parsedExpense.merchant,
                paymentMethod: account.name,
                accountId: accountId,
                receiptUrl: msg.parsedExpense.receiptUrl,
                date: new Date(),
            });

            updateMessage(messageId, {
                content: `✅ Saved!\n💰 ₹${msg.parsedExpense.amount.toFixed(2)} · ${msg.parsedExpense.category}\n💳 ${account.name}`,
                status: "saved",
            });
        } catch {
            updateMessage(messageId, {
                content: "❌ Failed to save. Please try again.",
                status: "error",
            });
        }
    };

    // Handle paste event for images
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.startsWith("image/")) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleFileUpload(file);
                return;
            }
        }
    };

    // Handle drag and drop
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    return (
        <>
            {/* Floating trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105",
                    "bg-primary text-primary-foreground",
                    isOpen && "rotate-90 scale-90"
                )}
                id="chat-trigger"
            >
                {isOpen ? (
                    <IconX className="h-6 w-6" />
                ) : (
                    <IconMessageCircle className="h-6 w-6" />
                )}
            </button>

            {/* Chat panel */}
            <div
                className={cn(
                    "fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-2xl transition-all duration-300",
                    "w-[380px] max-h-[600px]",
                    // Mobile: full screen
                    "max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:top-0 max-md:w-full max-md:max-h-full max-md:rounded-none",
                    isOpen
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 translate-y-4 pointer-events-none"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b bg-card px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <IconReceipt className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold">Quick Expense</h3>
                            <p className="text-xs text-muted-foreground">
                                Type, paste, or drop receipts
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:hidden"
                        onClick={() => setIsOpen(false)}
                    >
                        <IconX className="h-4 w-4" />
                    </Button>
                </div>

                {/* Drag overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2 text-primary">
                            <IconPhoto className="h-10 w-10" />
                            <p className="text-sm font-medium">Drop your receipt here</p>
                        </div>
                    </div>
                )}

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[300px] max-md:min-h-0">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground">
                            <IconMessageCircle className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-sm font-medium">No messages yet</p>
                            <p className="text-xs mt-1 max-w-[240px]">
                                Type &quot;Lunch 450&quot; or paste/drop a receipt image to get started
                            </p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col gap-1",
                                msg.role === "user" ? "items-end" : "items-start"
                            )}
                        >
                            {/* Image preview */}
                            {msg.attachment?.preview && (
                                <div className="max-w-[200px] overflow-hidden rounded-lg border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={msg.attachment.preview}
                                        alt={msg.attachment.name}
                                        className="w-full h-auto object-cover max-h-[150px]"
                                    />
                                </div>
                            )}

                            {/* PDF indicator */}
                            {msg.attachment?.type === "pdf" && !msg.attachment.preview && (
                                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                                    <IconFileText className="h-5 w-5 text-red-500" />
                                    <span className="truncate max-w-[150px]">{msg.attachment.name}</span>
                                </div>
                            )}

                            {/* Message bubble */}
                            <div
                                className={cn(
                                    "rounded-lg px-3 py-2 text-sm max-w-[90%] whitespace-pre-line",
                                    msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                )}
                            >
                                {msg.status === "parsing" && (
                                    <span className="flex items-center gap-2">
                                        <IconLoader2 className="h-4 w-4 animate-spin" />
                                        {msg.content}
                                    </span>
                                )}
                                {msg.status === "sending" && (
                                    <span className="flex items-center gap-2">
                                        <IconLoader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </span>
                                )}
                                {msg.status === "error" && (
                                    <span className="flex items-start gap-2">
                                        <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                                        {msg.content}
                                    </span>
                                )}
                                {msg.status === "saved" && (
                                    <span className="flex items-start gap-2">
                                        <IconCheck className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                                        {msg.content}
                                    </span>
                                )}
                                {(!msg.status || msg.status === "confirm") && msg.content}
                            </div>

                            {/* Account selection buttons */}
                            {msg.status === "confirm" && msg.parsedExpense && (
                                <div className="flex flex-col gap-1 w-full max-w-[90%]">
                                    <p className="text-xs text-muted-foreground px-1 mt-1">
                                        Select payment method:
                                    </p>
                                    <div className="grid grid-cols-2 gap-1">
                                        {accounts.map((acc) => (
                                            <button
                                                key={acc.id}
                                                onClick={() => handleSaveExpense(msg.id, acc.id)}
                                                className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                <span>{ACCOUNT_TYPE_ICONS[acc.type] || "💰"}</span>
                                                <span className="truncate">{acc.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {accounts.length === 0 && (
                                        <p className="text-xs text-destructive px-1">
                                            No accounts found. Add accounts in Settings first.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="border-t bg-card px-3 py-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                                e.target.value = ""; // Reset so same file can be selected again
                            }}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSending}
                            title="Attach image or PDF"
                        >
                            <IconPaperclip className="h-4 w-4" />
                        </Button>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            onPaste={handlePaste}
                            placeholder="Lunch 450 or paste receipt..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            disabled={isSending}
                            id="chat-input"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={handleSend}
                            disabled={!input.trim() || isSending}
                        >
                            <IconSend className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
