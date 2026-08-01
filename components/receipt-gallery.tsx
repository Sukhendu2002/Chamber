"use client";

import {
    type KeyboardEvent,
    useCallback,
    useMemo,
    useState,
    useTransition,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    IconArrowsMaximize,
    IconChevronLeft,
    IconChevronRight,
    IconCircleCheck,
    IconDotsVertical,
    IconDownload,
    IconExternalLink,
    IconFileTypePdf,
    IconLayoutGrid,
    IconList,
    IconLoader2,
    IconPhoto,
    IconSearch,
    IconX,
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
    "Lent Money",
    "General",
];

const ITEMS_PER_PAGE = 8;

const CATEGORY_COLORS: Record<string, string> = {
    Food: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    Travel: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    Entertainment: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300",
    Bills: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    Shopping: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
    Health: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300",
    Education: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
    Investments: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300",
    Subscription: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
    "Lent Money": "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
    General: "border-border bg-muted text-muted-foreground",
};

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
type ViewMode = "list" | "grid";

interface ReceiptGalleryProps {
    expenses: ReceiptExpense[];
    currency: string;
    currentSearch: string;
    currentCategory: string;
}

interface ReceiptThumbnailProps {
    expense: ReceiptExpense;
    hasError: boolean;
    onError: () => void;
}

function getExpenseLabel(expense: ReceiptExpense) {
    return expense.merchant || expense.description || expense.category;
}

function getReceiptUrl(expenseId: string, index: number) {
    return `/api/receipt/${expenseId}?index=${index}`;
}

function getExpenseUrl(expenseId: string) {
    const params = new URLSearchParams({ expenseId });
    return `/expenses?${params.toString()}`;
}

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function sortExpenses(expenses: ReceiptExpense[], sortOption: SortOption) {
    return [...expenses].sort((first, second) => {
        if (sortOption === "amount-desc") return second.amount - first.amount;
        if (sortOption === "amount-asc") return first.amount - second.amount;

        const firstDate = new Date(first.date).getTime();
        const secondDate = new Date(second.date).getTime();
        return sortOption === "date-asc"
            ? firstDate - secondDate
            : secondDate - firstDate;
    });
}

function getPageNumbers(currentPage: number, totalPages: number) {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages] as const;
    if (currentPage >= totalPages - 2) {
        return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as const;
    }

    return [1, "ellipsis-start", currentPage, "ellipsis-end", totalPages] as const;
}

function CategoryBadge({ category }: { category: string }) {
    return (
        <Badge
            variant="outline"
            className={cn("h-5 font-normal", CATEGORY_COLORS[category])}
        >
            {category}
        </Badge>
    );
}

function ReceiptThumbnail({ expense, hasError, onError }: ReceiptThumbnailProps) {
    if (hasError || expense.thumbnailIsPdf) {
        return (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-red-100 bg-red-50 dark:border-red-950 dark:bg-red-950/30">
                <IconFileTypePdf aria-hidden={true} className="size-5 text-red-500" />
                <span className="sr-only">PDF receipt</span>
            </div>
        );
    }

    return (
        <div className="relative size-11 shrink-0 overflow-hidden rounded-sm border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={expense.thumbnailUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover"
                onError={onError}
            />
            {expense.receiptCount > 1 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-sm bg-foreground/85 px-1 text-[9px] font-semibold text-background">
                    {expense.receiptCount}
                </span>
            )}
        </div>
    );
}

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
    const [sortOption, setSortOption] = useState<SortOption>("date-desc");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [page, setPage] = useState(1);
    const [selectedExpenseId, setSelectedExpenseId] = useState(expenses[0]?.id ?? null);
    const [receiptIndex, setReceiptIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [mediaErrors, setMediaErrors] = useState<Set<string>>(new Set());

    const formatCurrency = useCallback(
        (amount: number) =>
            new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount),
        [currency],
    );

    const sortedExpenses = useMemo(
        () => sortExpenses(expenses, sortOption),
        [expenses, sortOption],
    );
    const totalReceipts = expenses.reduce((sum, expense) => sum + expense.receiptCount, 0);
    const totalPages = Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);
    const currentPage = Math.min(page, Math.max(totalPages, 1));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageExpenses = sortedExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const selectedExpense =
        sortedExpenses.find((expense) => expense.id === selectedExpenseId) ??
        sortedExpenses[0] ??
        null;
    const hasFilters = Boolean(currentSearch || currentCategory);
    const selectedMediaKey = selectedExpense
        ? `${selectedExpense.id}-${receiptIndex}`
        : "";
    const selectedMediaIsPdf = Boolean(
        selectedExpense &&
        ((receiptIndex === 0 && selectedExpense.thumbnailIsPdf) || mediaErrors.has(selectedMediaKey)),
    );
    const categoryOptions = useMemo(
        () =>
            Array.from(
                new Set([
                    ...CATEGORIES,
                    ...expenses.map((expense) => expense.category),
                    ...(currentCategory ? [currentCategory] : []),
                ]),
            ),
        [currentCategory, expenses],
    );

    const updateFilters = (newSearch: string, newCategory: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (newSearch) params.set("search", newSearch);
        else params.delete("search");
        if (newCategory && newCategory !== "All") params.set("category", newCategory);
        else params.delete("category");
        params.delete("page");

        const query = params.toString();
        startTransition(() => router.push(query ? `/receipts?${query}` : "/receipts"));
    };

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault();
        updateFilters(search.trim(), currentCategory);
    };

    const clearFilters = () => {
        setSearch("");
        startTransition(() => router.push("/receipts"));
    };

    const selectExpense = (expense: ReceiptExpense) => {
        setSelectedExpenseId(expense.id);
        setReceiptIndex(0);
    };

    const handleRowKeyDown = (
        event: KeyboardEvent<HTMLTableRowElement>,
        expense: ReceiptExpense,
    ) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectExpense(expense);
    };

    const handleSortChange = (value: SortOption) => {
        const nextExpenses = sortExpenses(expenses, value);
        setSortOption(value);
        setPage(1);
        setSelectedExpenseId(nextExpenses[0]?.id ?? null);
        setReceiptIndex(0);
    };

    const changePage = (nextPage: number) => {
        const safePage = Math.min(Math.max(nextPage, 1), Math.max(totalPages, 1));
        const firstExpense = sortedExpenses[(safePage - 1) * ITEMS_PER_PAGE];
        setPage(safePage);
        setSelectedExpenseId(firstExpense?.id ?? null);
        setReceiptIndex(0);
    };

    const navigateReceipt = (direction: "prev" | "next") => {
        if (!selectedExpense) return;
        const nextIndex = direction === "next"
            ? (receiptIndex + 1) % selectedExpense.receiptCount
            : (receiptIndex - 1 + selectedExpense.receiptCount) % selectedExpense.receiptCount;
        setReceiptIndex(nextIndex);
    };

    const markMediaError = (expenseId: string, index: number) => {
        setMediaErrors((current) => new Set(current).add(`${expenseId}-${index}`));
    };

    return (
        <>
            <header className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <h1 className="page-title">Receipts</h1>
                    <p className="page-subtitle">
                        <span className="font-medium text-foreground">{totalReceipts}</span> receipts
                        {" · "}
                        <span className="font-medium text-foreground">{expenses.length}</span> linked expenses
                        {hasFilters && " (filtered)"}
                    </p>
                </div>

                <div
                    className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end"
                    aria-busy={isPending}
                >
                    <form onSubmit={handleSearch} className="relative min-w-0 sm:w-64">
                        {isPending ? (
                            <IconLoader2
                                aria-hidden={true}
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                            />
                        ) : (
                            <IconSearch
                                aria-hidden={true}
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                        )}
                        <Input
                            type="search"
                            aria-label="Search receipts"
                            placeholder="Search receipts..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="h-9 pl-9 pr-9"
                        />
                        <button type="submit" className="sr-only">Search</button>
                    </form>

                    <Select
                        value={currentCategory || "All"}
                        onValueChange={(value) => updateFilters(search.trim(), value)}
                        disabled={isPending}
                    >
                        <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Filter by category">
                            <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                            {categoryOptions.map((category) => (
                                <SelectItem key={category} value={category}>
                                    {category === "All" ? "All categories" : category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sortOption} onValueChange={handleSortChange}>
                        <SelectTrigger className="h-9 w-full sm:w-36" aria-label="Sort receipts">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date-desc">Newest first</SelectItem>
                            <SelectItem value="date-asc">Oldest first</SelectItem>
                            <SelectItem value="amount-desc">Highest amount</SelectItem>
                            <SelectItem value="amount-asc">Lowest amount</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex h-9 items-center rounded-md border bg-card p-0.5" role="group" aria-label="Receipt view">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="List view"
                            aria-pressed={viewMode === "list"}
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "h-8 w-9 rounded-sm shadow-none",
                                viewMode === "list" && "bg-emerald-50 text-emerald-800 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
                            )}
                        >
                            <IconList aria-hidden={true} className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Grid view"
                            aria-pressed={viewMode === "grid"}
                            onClick={() => setViewMode("grid")}
                            className={cn(
                                "h-8 w-9 rounded-sm shadow-none",
                                viewMode === "grid" && "bg-emerald-50 text-emerald-800 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
                            )}
                        >
                            <IconLayoutGrid aria-hidden={true} className="size-4" />
                        </Button>
                    </div>

                    {hasFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            aria-label="Clear receipt filters"
                            onClick={clearFilters}
                            disabled={isPending}
                        >
                            <IconX aria-hidden={true} />
                        </Button>
                    )}
                </div>
            </header>

            {expenses.length > 0 ? (
                <div className="grid items-start gap-4 min-[1400px]:grid-cols-[minmax(0,1fr)_minmax(340px,0.38fr)]">
                    <section className="min-w-0 overflow-hidden rounded-md border bg-card" aria-label="Receipt list">
                        <div className="flex h-12 items-center gap-3 border-b px-4">
                            <h2 className="text-sm font-semibold">All receipts</h2>
                            <span className="text-xs text-muted-foreground">{expenses.length} items</span>
                        </div>

                        {viewMode === "list" ? (
                            <>
                                <div className="hidden lg:block">
                                    <Table className="min-w-[700px]">
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[38%]">Receipt</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pageExpenses.map((expense) => {
                                                const isSelected = selectedExpense?.id === expense.id;
                                                const thumbnailError = mediaErrors.has(`${expense.id}-0`);

                                                return (
                                                    <TableRow
                                                        key={expense.id}
                                                        tabIndex={0}
                                                        aria-selected={isSelected}
                                                        data-state={isSelected ? "selected" : undefined}
                                                        onClick={() => selectExpense(expense)}
                                                        onKeyDown={(event) => handleRowKeyDown(event, expense)}
                                                        className={cn(
                                                            "h-16 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
                                                            isSelected && "bg-emerald-50/70 shadow-[inset_3px_0_0_0_rgb(22_101_52)] hover:bg-emerald-50/80 dark:bg-emerald-950/25 dark:shadow-[inset_3px_0_0_0_rgb(74_222_128)] dark:hover:bg-emerald-950/35",
                                                        )}
                                                    >
                                                        <TableCell>
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <ReceiptThumbnail
                                                                    expense={expense}
                                                                    hasError={thumbnailError}
                                                                    onError={() => markMediaError(expense.id, 0)}
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium">{getExpenseLabel(expense)}</p>
                                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                        {expense.receiptCount} {expense.receiptCount === 1 ? "receipt" : "receipts"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell><CategoryBadge category={expense.category} /></TableCell>
                                                        <TableCell className="text-muted-foreground">{formatDate(expense.date)}</TableCell>
                                                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(expense.amount)}</TableCell>
                                                        <TableCell>
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <IconCircleCheck aria-hidden={true} className="size-4 text-emerald-600 dark:text-emerald-400" />
                                                                Linked
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div onClick={(event) => event.stopPropagation()}>
                                                                <ReceiptActions
                                                                    expense={expense}
                                                                    onPreview={() => selectExpense(expense)}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="divide-y lg:hidden">
                                    {pageExpenses.map((expense) => {
                                        const isSelected = selectedExpense?.id === expense.id;
                                        return (
                                            <button
                                                key={expense.id}
                                                type="button"
                                                aria-pressed={isSelected}
                                                onClick={() => selectExpense(expense)}
                                                className={cn(
                                                    "flex w-full items-center gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
                                                    isSelected && "bg-emerald-50/70 shadow-[inset_3px_0_0_0_rgb(22_101_52)] dark:bg-emerald-950/25 dark:shadow-[inset_3px_0_0_0_rgb(74_222_128)]",
                                                )}
                                            >
                                                <ReceiptThumbnail
                                                    expense={expense}
                                                    hasError={mediaErrors.has(`${expense.id}-0`)}
                                                    onError={() => markMediaError(expense.id, 0)}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium">{getExpenseLabel(expense)}</span>
                                                    <span className="mt-1 flex items-center gap-2">
                                                        <CategoryBadge category={expense.category} />
                                                        <span className="text-[11px] text-muted-foreground">{formatDate(expense.date)}</span>
                                                    </span>
                                                </span>
                                                <span className="text-sm font-medium tabular-nums">{formatCurrency(expense.amount)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 min-[1400px]:grid-cols-2 2xl:grid-cols-3">
                                {pageExpenses.map((expense) => {
                                    const isSelected = selectedExpense?.id === expense.id;
                                    const thumbnailError = mediaErrors.has(`${expense.id}-0`);
                                    return (
                                        <button
                                            key={expense.id}
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() => selectExpense(expense)}
                                            className={cn(
                                                "overflow-hidden rounded-md border bg-background text-left outline-none transition-[border-color,background-color,box-shadow] hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring/40",
                                                isSelected && "border-emerald-600 ring-1 ring-emerald-600/20 dark:border-emerald-500",
                                            )}
                                        >
                                            <div className="flex h-24 items-center justify-center overflow-hidden bg-muted/45">
                                                {thumbnailError || expense.thumbnailIsPdf ? (
                                                    <IconFileTypePdf aria-hidden={true} className="size-9 text-red-500" />
                                                ) : (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={expense.thumbnailUrl}
                                                        alt=""
                                                        loading="lazy"
                                                        className="size-full object-cover"
                                                        onError={() => markMediaError(expense.id, 0)}
                                                    />
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <p className="truncate text-sm font-medium">{getExpenseLabel(expense)}</p>
                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                    <CategoryBadge category={expense.category} />
                                                    <span className="text-xs font-medium tabular-nums">{formatCurrency(expense.amount)}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <ReceiptPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            startIndex={startIndex}
                            itemCount={pageExpenses.length}
                            totalItems={sortedExpenses.length}
                            onPageChange={changePage}
                        />
                    </section>

                    <ReceiptPreview
                        expense={selectedExpense}
                        currencyFormatter={formatCurrency}
                        receiptIndex={receiptIndex}
                        isPdf={selectedMediaIsPdf}
                        onMediaError={() => selectedExpense && markMediaError(selectedExpense.id, receiptIndex)}
                        onNavigate={navigateReceipt}
                        onExpand={() => setLightboxOpen(true)}
                    />
                </div>
            ) : (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-md border border-dashed bg-card px-6 text-center">
                    <IconPhoto aria-hidden={true} className="mb-3 size-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No receipts found</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                        {hasFilters
                            ? "Try a different search or clear the active category filter."
                            : "Receipts will appear here after they are attached to an expense."}
                    </p>
                    {hasFilters && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                            Clear filters
                        </Button>
                    )}
                </div>
            )}

            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-5xl overflow-hidden p-0">
                    <DialogHeader className="border-b px-4 py-3">
                        <DialogTitle className="flex items-center justify-between gap-4 pr-8 text-sm font-medium">
                            <span>{selectedExpense ? getExpenseLabel(selectedExpense) : "Receipt"}</span>
                            {selectedExpense && selectedExpense.receiptCount > 1 && (
                                <span className="text-xs font-normal text-muted-foreground">
                                    {receiptIndex + 1} of {selectedExpense.receiptCount}
                                </span>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedExpense && (
                        <div className="relative flex min-h-[420px] max-h-[78vh] items-center justify-center bg-muted/45 p-4">
                            <ReceiptMedia
                                expense={selectedExpense}
                                receiptIndex={receiptIndex}
                                isPdf={selectedMediaIsPdf}
                                onError={() => markMediaError(selectedExpense.id, receiptIndex)}
                                expanded={true}
                            />
                            {selectedExpense.receiptCount > 1 && (
                                <ReceiptNavigation onNavigate={navigateReceipt} />
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

interface ReceiptActionsProps {
    expense: ReceiptExpense;
    onPreview: () => void;
}

function ReceiptActions({ expense, onPreview }: ReceiptActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${getExpenseLabel(expense)}`}>
                    <IconDotsVertical aria-hidden={true} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={onPreview}>
                    <IconPhoto aria-hidden={true} />
                    Preview
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={getExpenseUrl(expense.id)}>
                        <IconExternalLink aria-hidden={true} />
                        View expense
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a href={getReceiptUrl(expense.id, 0)} download>
                        <IconDownload aria-hidden={true} />
                        Download
                    </a>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

interface ReceiptPaginationProps {
    currentPage: number;
    totalPages: number;
    startIndex: number;
    itemCount: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

function ReceiptPagination({
    currentPage,
    totalPages,
    startIndex,
    itemCount,
    totalItems,
    onPageChange,
}: ReceiptPaginationProps) {
    const pageNumbers = getPageNumbers(currentPage, totalPages);

    return (
        <div className="flex min-h-12 flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
                {startIndex + 1}–{startIndex + itemCount} of {totalItems} items
            </p>
            {totalPages > 1 && (
                <nav className="flex items-center gap-1" aria-label="Receipt pages">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Previous page"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                    >
                        <IconChevronLeft aria-hidden={true} />
                    </Button>
                    {pageNumbers.map((pageNumber) =>
                        typeof pageNumber === "number" ? (
                            <Button
                                key={pageNumber}
                                type="button"
                                variant={pageNumber === currentPage ? "secondary" : "ghost"}
                                size="icon-sm"
                                aria-label={`Page ${pageNumber}`}
                                aria-current={pageNumber === currentPage ? "page" : undefined}
                                onClick={() => onPageChange(pageNumber)}
                            >
                                {pageNumber}
                            </Button>
                        ) : (
                            <span key={pageNumber} className="px-1 text-xs text-muted-foreground">…</span>
                        ),
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Next page"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                    >
                        <IconChevronRight aria-hidden={true} />
                    </Button>
                </nav>
            )}
        </div>
    );
}

interface ReceiptPreviewProps {
    expense: ReceiptExpense | null;
    currencyFormatter: (amount: number) => string;
    receiptIndex: number;
    isPdf: boolean;
    onMediaError: () => void;
    onNavigate: (direction: "prev" | "next") => void;
    onExpand: () => void;
}

function ReceiptPreview({
    expense,
    currencyFormatter,
    receiptIndex,
    isPdf,
    onMediaError,
    onNavigate,
    onExpand,
}: ReceiptPreviewProps) {
    return (
        <aside className="overflow-hidden rounded-md border bg-card min-[1400px]:sticky min-[1400px]:top-6" aria-label="Receipt preview">
            <div className="flex h-12 items-center justify-between border-b px-4">
                <h2 className="text-sm font-semibold">Receipt preview</h2>
                {expense && (
                    <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Expand receipt" onClick={onExpand}>
                            <IconArrowsMaximize aria-hidden={true} />
                        </Button>
                        <ReceiptActions expense={expense} onPreview={onExpand} />
                    </div>
                )}
            </div>

            {expense ? (
                <>
                    <div className="relative flex min-h-72 max-h-[400px] items-center justify-center overflow-hidden bg-muted/45 p-3">
                        <ReceiptMedia
                            expense={expense}
                            receiptIndex={receiptIndex}
                            isPdf={isPdf}
                            onError={onMediaError}
                            expanded={false}
                        />
                        {expense.receiptCount > 1 && (
                            <ReceiptNavigation onNavigate={onNavigate} />
                        )}
                    </div>
                    <div className="border-t p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold">{getExpenseLabel(expense)}</h3>
                                <p className="mt-1 text-base font-semibold tabular-nums">{currencyFormatter(expense.amount)}</p>
                            </div>
                            {expense.receiptCount > 1 && (
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {receiptIndex + 1} of {expense.receiptCount}
                                </span>
                            )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <CategoryBadge category={expense.category} />
                            <span className="text-xs text-muted-foreground">{formatDate(expense.date)}</span>
                        </div>
                        <p className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                            <IconCircleCheck aria-hidden={true} className="size-4 text-emerald-600 dark:text-emerald-400" />
                            Linked to expense
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Button variant="outline" asChild>
                                <Link href={getExpenseUrl(expense.id)}>
                                    View expense
                                    <IconExternalLink aria-hidden={true} />
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <a href={getReceiptUrl(expense.id, receiptIndex)} download>
                                    <IconDownload aria-hidden={true} />
                                    Download
                                </a>
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex min-h-72 items-center justify-center px-6 text-center text-xs text-muted-foreground">
                    Select a receipt to preview it.
                </div>
            )}
        </aside>
    );
}

interface ReceiptMediaProps {
    expense: ReceiptExpense;
    receiptIndex: number;
    isPdf: boolean;
    onError: () => void;
    expanded: boolean;
}

function ReceiptMedia({
    expense,
    receiptIndex,
    isPdf,
    onError,
    expanded,
}: ReceiptMediaProps) {
    if (isPdf) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-16 items-center justify-center rounded-md border border-red-100 bg-red-50 dark:border-red-950 dark:bg-red-950/30">
                    <IconFileTypePdf aria-hidden={true} className="size-8 text-red-500" />
                </span>
                <div>
                    <p className="text-sm font-medium">PDF receipt</p>
                    <p className="mt-1 text-xs text-muted-foreground">Open the document in a new tab to view it.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <a href={getReceiptUrl(expense.id, receiptIndex)} target="_blank" rel="noopener noreferrer">
                        <IconExternalLink aria-hidden={true} />
                        Open PDF
                    </a>
                </Button>
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            key={`${expense.id}-${receiptIndex}`}
            src={getReceiptUrl(expense.id, receiptIndex)}
            alt={`Receipt for ${getExpenseLabel(expense)}`}
            className={cn(
                "h-auto max-w-full rounded-sm object-contain",
                expanded ? "max-h-[72vh]" : "max-h-[376px]",
            )}
            onError={onError}
        />
    );
}

function ReceiptNavigation({
    onNavigate,
}: {
    onNavigate: (direction: "prev" | "next") => void;
}) {
    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous receipt"
                onClick={() => onNavigate("prev")}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/95 shadow-sm"
            >
                <IconChevronLeft aria-hidden={true} />
            </Button>
            <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next receipt"
                onClick={() => onNavigate("next")}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/95 shadow-sm"
            >
                <IconChevronRight aria-hidden={true} />
            </Button>
        </>
    );
}
