"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
    IconSearch,
    IconZoomIn,
    IconChevronLeft,
    IconChevronRight,
    IconExternalLink,
    IconX,
    IconPhoto,
    IconFileTypePdf,
} from "@tabler/icons-react";
import type { ReceiptExpense } from "@/lib/actions/receipts";

const CATEGORIES = [
    "All",
    "Food",
    "Travel",
    "Entertainment",
    "Bills",
    "Shopping",
    "Health",
    "Education",
    "Investments",
    "Subscription",
    "General",
];

const CATEGORY_COLORS: Record<string, string> = {
    Food: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Travel: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Entertainment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    Bills: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Shopping: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    Health: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    Education: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    Investments: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Subscription: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    General: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

type LightboxState = {
    expense: ReceiptExpense;
    currentIndex: number;
    currentIsPdf: boolean;
};

type ReceiptGalleryProps = {
    expenses: ReceiptExpense[];
    currency: string;
    currentSearch: string;
    currentCategory: string;
};

export function ReceiptGallery({
    expenses,
    currency,
    currentSearch,
    currentCategory,
}: ReceiptGalleryProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState(currentSearch);
    const [lightbox, setLightbox] = useState<LightboxState | null>(null);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    const [lightboxPdfIndexes, setLightboxPdfIndexes] = useState<Set<number>>(new Set());

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const updateFilters = (newSearch: string, newCategory: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (newSearch) params.set("search", newSearch);
        else params.delete("search");
        if (newCategory && newCategory !== "All") params.set("category", newCategory);
        else params.delete("category");
        params.delete("page");
        startTransition(() => {
            router.push(`/receipts?${params.toString()}`);
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters(search, currentCategory);
    };

    const handleCategoryChange = (value: string) => {
        updateFilters(search, value);
    };

    const clearFilters = () => {
        setSearch("");
        startTransition(() => router.push("/receipts"));
    };

    const openLightbox = (expense: ReceiptExpense) => {
        setLightboxPdfIndexes(new Set());
        setLightbox({ expense, currentIndex: 0, currentIsPdf: expense.thumbnailIsPdf });
    };

    const closeLightbox = () => { setLightbox(null); setLightboxPdfIndexes(new Set()); };

    const navigateLightbox = useCallback((direction: "prev" | "next") => {
        if (!lightbox) return;
        const total = lightbox.expense.receiptCount;
        const next = direction === "next"
            ? (lightbox.currentIndex + 1) % total
            : (lightbox.currentIndex - 1 + total) % total;
        const nextIsPdf = lightboxPdfIndexes.has(next);
        setLightbox({ ...lightbox, currentIndex: next, currentIsPdf: nextIsPdf });
    }, [lightbox, lightboxPdfIndexes]);

    const handleLightboxImageError = useCallback(() => {
        if (!lightbox) return;
        const idx = lightbox.currentIndex;
        setLightboxPdfIndexes((prev) => new Set(prev).add(idx));
        setLightbox((prev) => prev ? { ...prev, currentIsPdf: true } : null);
    }, [lightbox]);

    const handleImageError = (id: string) => {
        setImageErrors((prev) => new Set(prev).add(id));
    };

    const hasFilters = currentSearch || currentCategory;
    const totalReceipts = expenses.reduce((sum, e) => sum + e.receiptCount, 0);

    return (
        <>
            {/* Stats + Filters */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{expenses.length}</span> expenses &middot;{" "}
                    <span className="font-semibold text-foreground">{totalReceipts}</span> receipts
                    {hasFilters && " (filtered)"}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search receipts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-56 pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary" disabled={isPending} size="sm">
                            Search
                        </Button>
                    </form>

                    <div className="flex items-center gap-2">
                        <Select value={currentCategory || "All"} onValueChange={handleCategoryChange}>
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending}>
                                <IconX className="mr-1 h-4 w-4" />
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid */}
            {expenses.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {expenses.map((expense) => {
                        const hasError = imageErrors.has(expense.id);
                        const label = expense.merchant || expense.description || expense.category;
                        return (
                            <Card
                                key={expense.id}
                                className="group cursor-pointer overflow-hidden border transition-all hover:border-primary hover:shadow-md"
                                onClick={() => openLightbox(expense)}
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-square overflow-hidden bg-muted">
                                    {hasError || expense.thumbnailIsPdf ? (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-red-50 dark:bg-red-950/20">
                                            <IconFileTypePdf className="h-10 w-10 text-red-500" />
                                            <span className="text-xs font-medium text-red-600 dark:text-red-400">PDF</span>
                                        </div>
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={expense.thumbnailUrl}
                                            alt={`Receipt for ${label}`}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={() => handleImageError(expense.id)}
                                        />
                                    )}
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                        <IconZoomIn className="h-8 w-8 text-white" />
                                    </div>
                                    {/* Receipt count badge */}
                                    {expense.receiptCount > 1 && (
                                        <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1.5 text-xs font-medium text-white">
                                            {expense.receiptCount}
                                        </span>
                                    )}
                                </div>

                                {/* Info */}
                                <CardContent className="p-2.5">
                                    <p className="truncate text-sm font-medium">{label}</p>
                                    <div className="mt-1 flex items-center justify-between">
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs ${CATEGORY_COLORS[expense.category] || ""}`}
                                        >
                                            {expense.category}
                                        </Badge>
                                        <span className="text-xs font-medium">{formatCurrency(expense.amount)}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {new Date(expense.date).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
                    <IconPhoto className="mb-3 h-12 w-12 text-muted-foreground/40" />
                    <p className="text-base font-medium text-muted-foreground">No receipts found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {hasFilters
                            ? "Try adjusting your search or filter."
                            : "Upload receipts when adding or editing expenses."}
                    </p>
                    {hasFilters && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    )}
                </div>
            )}

            {/* Lightbox */}
            <Dialog open={!!lightbox} onOpenChange={(open) => !open && closeLightbox()}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                    <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
                        <div>
                            <DialogTitle className="text-sm font-medium">
                                {lightbox && (lightbox.expense.merchant || lightbox.expense.description || lightbox.expense.category)}
                            </DialogTitle>
                            {lightbox && lightbox.expense.receiptCount > 1 && (
                                <p className="text-xs text-muted-foreground">
                                    {lightbox.currentIndex + 1} of {lightbox.expense.receiptCount}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {lightbox && (
                                <Link
                                    href={`/expenses`}
                                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <IconExternalLink className="h-3.5 w-3.5" />
                                    View Expense
                                </Link>
                            )}
                        </div>
                    </DialogHeader>

                    {lightbox && (
                        <div className="relative bg-black/5 dark:bg-black/40">
                            <div className="relative flex min-h-[400px] max-h-[70vh] items-center justify-center overflow-hidden">
                                {lightbox.currentIsPdf ? (
                                    <div className="flex w-full flex-col items-center justify-center gap-4 p-10">
                                        <IconFileTypePdf className="h-20 w-20 text-red-500" />
                                        <p className="text-sm font-medium">PDF Receipt</p>
                                        <a
                                            href={`/api/receipt/${lightbox.expense.id}?index=${lightbox.currentIndex}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            <IconExternalLink className="h-4 w-4" />
                                            Open PDF in new tab
                                        </a>
                                    </div>
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={`${lightbox.expense.id}-${lightbox.currentIndex}`}
                                        src={`/api/receipt/${lightbox.expense.id}?index=${lightbox.currentIndex}`}
                                        alt="Receipt"
                                        className="max-h-[70vh] w-auto object-contain"
                                        onError={handleLightboxImageError}
                                    />
                                )}
                            </div>

                            {/* Prev / Next arrows */}
                            {lightbox.expense.receiptCount > 1 && (
                                <>
                                    <button
                                        onClick={() => navigateLightbox("prev")}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <IconChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => navigateLightbox("next")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <IconChevronRight className="h-5 w-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Footer info */}
                    {lightbox && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="secondary"
                                    className={`text-xs ${CATEGORY_COLORS[lightbox.expense.category] || ""}`}
                                >
                                    {lightbox.expense.category}
                                </Badge>
                                <span className="text-sm font-medium">{formatCurrency(lightbox.expense.amount)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {new Date(lightbox.expense.date).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
