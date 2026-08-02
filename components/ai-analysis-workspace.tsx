"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconChartPie,
  IconCheck,
  IconChevronRight,
  IconFileAnalytics,
  IconLoader2,
  IconPigMoney,
  IconRefresh,
  IconReportAnalytics,
  IconShieldCheck,
  IconSparkles,
  IconTargetArrow,
} from "@tabler/icons-react";

import {
  generateAiReport,
  getAiPeriodPreview,
  getAiReport,
} from "@/lib/actions/ai-analysis";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AI_REPORT_TYPE_LABELS,
  type AiAnalysisPageData,
  type AiPeriodPreview,
  type AiReportListItem,
  type AiReportPeriod,
  type AiReportRecord,
  type AiReportRequest,
  type AiReportType,
} from "@/types/ai-analysis";

interface ReportOption {
  type: AiReportType;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  recommended?: boolean;
}

interface AiAnalysisWorkspaceProps {
  data: AiAnalysisPageData;
  initialRequest: AiReportRequest;
  initialPreview: AiPeriodPreview;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const REPORT_OPTIONS: ReportOption[] = [
  {
    type: "SPENDING_REVIEW",
    title: "Spending Review",
    description: "Find overspending and costly patterns",
    icon: IconChartPie,
  },
  {
    type: "SAVINGS_REVIEW",
    title: "Savings Review",
    description: "Find realistic ways to save more",
    icon: IconPigMoney,
  },
  {
    type: "DEEP_ANALYSIS",
    title: "Deep Analysis",
    description: "A complete spending and savings plan",
    icon: IconReportAnalytics,
    recommended: true,
  },
];

function getPeriodLabel(
  period: AiReportPeriod,
  year: number,
  month: number | null | undefined,
): string {
  if (period === "MONTHLY" && month) {
    return `${MONTHS[month - 1]} ${year}`;
  }
  return year.toString();
}

function getReportPeriodLabel(report: AiReportListItem): string {
  return getPeriodLabel(report.period, report.year, report.month);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function ReportLoadingState() {
  return (
    <Card aria-label="Generating AI report" aria-busy="true">
      <CardContent className="space-y-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <IconLoader2 aria-hidden="true" className="size-4 animate-spin" />
          Analyzing your financial data…
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse bg-card p-4">
              <div className="h-5 w-24 rounded-sm bg-muted" />
              <div className="mt-2 h-3 w-16 rounded-sm bg-muted" />
            </div>
          ))}
        </div>
        <div className="h-28 animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  );
}

function ReportEmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-52 flex-col items-center justify-center text-center">
        <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-primary">
          <IconFileAnalytics aria-hidden="true" className="size-5" />
        </span>
        <h2 className="mt-3 text-sm font-semibold">No report generated yet</h2>
        <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
          Choose a report and period above. Chamber will only contact the AI service after you
          press the generate button.
        </p>
      </CardContent>
    </Card>
  );
}

function ReportResult({
  report,
  onRegenerate,
  isGenerating,
}: {
  report: AiReportRecord;
  onRegenerate: () => void;
  isGenerating: boolean;
}) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: report.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const metrics = report.content.metrics;
  const change = metrics.spendingChangePercent;
  const reportLabel = getPeriodLabel(report.period, report.year, report.month);
  const generatedAt = new Date(report.createdAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const metricItems = [
    {
      value: formatCurrency(metrics.spendingExcludingInvestments),
      label: "Spent",
      className: "text-foreground",
    },
    {
      value: metrics.budget > 0 ? formatCurrency(metrics.budget) : "Not set",
      label: "Budget",
      className: "text-foreground",
    },
    {
      value: metrics.estimatedSavingsRate === null
        ? "Not set"
        : `${metrics.estimatedSavingsRate.toFixed(1)}%`,
      label: "Est. savings rate",
      className: "text-foreground",
    },
    {
      value: change === null ? "No baseline" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
      label: `vs previous ${report.period === "MONTHLY" ? "month" : "period"}`,
      className: change === null
        ? "text-muted-foreground"
        : change > 0
          ? "text-destructive"
          : "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <section aria-labelledby="report-title" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="report-title" className="text-xl font-semibold tracking-[-0.025em]">
            {reportLabel} report
          </h2>
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
            {generatedAt}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={onRegenerate}
          disabled={isGenerating}
          className="min-h-11 sm:min-h-9"
        >
          {isGenerating ? (
            <IconLoader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <IconRefresh aria-hidden="true" />
          )}
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border lg:grid-cols-4">
        {metricItems.map((metric) => (
          <div key={metric.label} className="bg-card px-3 py-4 text-center sm:px-4">
            <p className={cn("text-lg font-semibold tracking-[-0.035em] tabular-nums sm:text-2xl", metric.className)}>
              {metric.value}
            </p>
            <p className="mt-1 text-[0.6875rem] text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </div>

      <Card size="sm">
        <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-3">
          <span className="row-span-2 flex size-9 items-center justify-center rounded-md border bg-secondary text-primary">
            <IconSparkles aria-hidden="true" className="size-4" />
          </span>
          <CardTitle>Assessment</CardTitle>
          <CardDescription>AI-generated interpretation of the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium leading-6">{report.content.assessment}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Key findings</CardTitle>
            <CardDescription>What stands out in the numbers</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {report.content.findings.map((finding) => (
              <div key={`${finding.title}-${finding.evidence}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    finding.tone === "warning" && "bg-destructive",
                    finding.tone === "positive" && "bg-emerald-500",
                    finding.tone === "neutral" && "bg-muted-foreground",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs font-semibold">{finding.title}</p>
                    <Badge variant="outline" className="max-w-full tabular-nums">
                      {finding.evidence}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{finding.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Top opportunities</CardTitle>
            <CardDescription>Prioritized ways to improve</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {report.content.opportunities.map((opportunity, index) => (
              <div key={`${opportunity.title}-${index}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] font-semibold">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs font-semibold">{opportunity.title}</p>
                    {opportunity.monthlyImpact !== null && opportunity.monthlyImpact > 0 ? (
                      <Badge className="border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        Est. {formatCurrency(opportunity.monthlyImpact)}/mo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{opportunity.priority} priority</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{opportunity.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>30-day action plan</CardTitle>
            <CardDescription>Concrete steps for the next month</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {report.content.actionPlan.map((action, index) => (
              <div key={`${action.title}-${index}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs font-semibold">{action.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {report.content.caveats.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
          <IconAlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Data notes</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {report.content.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

export function AiAnalysisWorkspace({
  data,
  initialRequest,
  initialPreview,
}: AiAnalysisWorkspaceProps) {
  const [reportType, setReportType] = useState<AiReportType>(initialRequest.type);
  const [period, setPeriod] = useState<AiReportPeriod>(initialRequest.period);
  const [year, setYear] = useState(initialRequest.year);
  const [month, setMonth] = useState(initialRequest.month || data.currentMonth);
  const [preview, setPreview] = useState(initialPreview);
  const [activeReport, setActiveReport] = useState<AiReportRecord | null>(data.latestReport);
  const [recentReports, setRecentReports] = useState(data.recentReports);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRequestId = useRef(0);
  const initialPreviewKey = useRef(
    `${initialRequest.period}-${initialRequest.year}-${initialRequest.month || "year"}`,
  );

  const selectedPeriodKey = `${period}-${year}-${period === "MONTHLY" ? month : "year"}`;

  useEffect(() => {
    if (initialPreviewKey.current === selectedPeriodKey) {
      initialPreviewKey.current = "";
      return;
    }

    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    setIsPreviewLoading(true);

    void getAiPeriodPreview({
      type: reportType,
      period,
      year,
      month: period === "MONTHLY" ? month : undefined,
    })
      .then((nextPreview) => {
        if (previewRequestId.current === requestId) setPreview(nextPreview);
      })
      .catch((previewError: unknown) => {
        if (previewRequestId.current === requestId) setError(getErrorMessage(previewError));
      })
      .finally(() => {
        if (previewRequestId.current === requestId) setIsPreviewLoading(false);
      });
  }, [month, period, reportType, selectedPeriodKey, year]);

  const request: AiReportRequest = {
    type: reportType,
    period,
    year,
    month: period === "MONTHLY" ? month : undefined,
  };

  const reportOption = REPORT_OPTIONS.find((option) => option.type === reportType) || REPORT_OPTIONS[2];
  const selectedPeriodLabel = getPeriodLabel(period, year, month);
  const savingsNeedsIncome = reportType === "SAVINGS_REVIEW" && !preview.incomeReady;
  const canGenerate = data.reportStorageReady
    && preview.transactionCount > 0
    && !savingsNeedsIncome
    && !isPreviewLoading;

  async function handleGenerate(override?: AiReportRequest) {
    const nextRequest = override || request;
    setError(null);
    setIsGenerating(true);

    try {
      const generatedReport = await generateAiReport(nextRequest);
      setActiveReport(generatedReport);
      setReportType(generatedReport.type);
      setPeriod(generatedReport.period);
      setYear(generatedReport.year);
      if (generatedReport.month) setMonth(generatedReport.month);
      setRecentReports((current) => [
        {
          id: generatedReport.id,
          type: generatedReport.type,
          period: generatedReport.period,
          year: generatedReport.year,
          month: generatedReport.month,
          createdAt: generatedReport.createdAt,
        },
        ...current.filter((report) => report.id !== generatedReport.id),
      ].slice(0, 8));
    } catch (generationError: unknown) {
      setError(getErrorMessage(generationError));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleOpenReport(report: AiReportListItem) {
    setError(null);
    setIsLoadingReport(true);

    try {
      const savedReport = await getAiReport(report.id);
      setActiveReport(savedReport);
      setReportType(savedReport.type);
      setPeriod(savedReport.period);
      setYear(savedReport.year);
      if (savedReport.month) setMonth(savedReport.month);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoadingReport(false);
    }
  }

  function handleRegenerate() {
    if (!activeReport) return;
    void handleGenerate({
      type: activeReport.type,
      period: activeReport.period,
      year: activeReport.year,
      month: activeReport.month || undefined,
    });
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="report-controls-title" className="space-y-3">
        <h2 id="report-controls-title" className="sr-only">Report controls</h2>

        {!data.reportStorageReady && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <IconAlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              AI Analysis is temporarily unavailable while its database setup finishes.
              Your existing financial data is unaffected.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex w-fit rounded-md border bg-muted/40 p-0.5" role="group" aria-label="Report period">
            {(["MONTHLY", "YEARLY"] as const).map((periodOption) => (
              <button
                key={periodOption}
                type="button"
                aria-pressed={period === periodOption}
                onClick={() => setPeriod(periodOption)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-sm px-4 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 sm:min-h-8",
                  period === periodOption
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {periodOption === "MONTHLY" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>

          {period === "MONTHLY" && (
            <Select value={month.toString()} onValueChange={(value) => setMonth(Number(value))}>
              <SelectTrigger className="min-h-11 w-full sm:min-h-8 sm:w-36" aria-label="Month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((monthName, index) => (
                  <SelectItem
                    key={monthName}
                    value={(index + 1).toString()}
                    disabled={year === data.currentYear && index + 1 > data.currentMonth}
                  >
                    {monthName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={year.toString()}
            onValueChange={(value) => {
              const nextYear = Number(value);
              setYear(nextYear);
              if (nextYear === data.currentYear && month > data.currentMonth) {
                setMonth(data.currentMonth);
              }
            }}
          >
            <SelectTrigger className="min-h-11 w-full sm:min-h-8 sm:w-28" aria-label="Year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.availableYears.map((availableYear) => (
                <SelectItem key={availableYear} value={availableYear.toString()}>
                  {availableYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Choose a report</legend>
          <div className="grid gap-3 lg:grid-cols-3">
            {REPORT_OPTIONS.map((option) => {
              const isSelected = reportType === option.type;
              return (
                <button
                  key={option.type}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setReportType(option.type)}
                  className={cn(
                    "group flex min-h-24 cursor-pointer items-center gap-3 rounded-md border bg-card p-4 text-left outline-none transition-colors duration-150 hover:border-primary/40 hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/40",
                    isSelected && "border-primary ring-1 ring-primary",
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground group-hover:text-foreground">
                    <option.icon aria-hidden={true} className="size-5 stroke-[1.8]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{option.title}</span>
                      {option.recommended && <Badge variant="secondary">Recommended</Badge>}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  {isSelected && (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <IconCheck aria-hidden="true" className="size-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  isPreviewLoading ? "animate-pulse bg-muted-foreground" : preview.transactionCount > 0 ? "bg-emerald-500" : "bg-destructive",
                )}
              />
              <span>{isPreviewLoading ? "Checking data…" : `${preview.transactionCount} transactions`}</span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span>{preview.budgetReady ? "Budget ready" : "Budget not set"}</span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span>{preview.incomeReady ? "Income ready" : "Income not set"}</span>
            </div>
            <div className="flex items-center gap-2 border-border text-muted-foreground sm:border-l sm:pl-4">
              <IconShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              Nothing is sent to AI until you generate a report.
            </div>
          </div>

          <Button
            size="lg"
            className="min-h-11 w-full px-4 lg:w-auto"
            disabled={!canGenerate || isGenerating}
            onClick={() => void handleGenerate()}
          >
            {isGenerating ? (
              <IconLoader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <IconSparkles aria-hidden="true" />
            )}
            {isGenerating ? `Analyzing ${selectedPeriodLabel}…` : `Generate ${reportOption.title.toLowerCase()}`}
          </Button>
        </div>

        {preview.transactionCount === 0 && !isPreviewLoading && (
          <p className="flex items-center gap-2 text-xs text-destructive">
            <IconAlertCircle aria-hidden="true" className="size-4" />
            Add expenses for {selectedPeriodLabel} before generating a report.
          </p>
        )}

        {savingsNeedsIncome && (
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <IconTargetArrow aria-hidden="true" className="size-4" />
            Savings Review needs your monthly income.
            <Link href="/settings" className="font-semibold text-foreground underline underline-offset-4">
              Add it in Settings
            </Link>
          </p>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <IconAlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" className="cursor-pointer font-semibold underline underline-offset-4" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}
      </section>

      <div className="border-t" />

      <div aria-live="polite" className="sr-only">
        {isGenerating ? "Generating AI report" : ""}
        {isLoadingReport ? "Loading saved report" : ""}
      </div>

      {isGenerating ? (
        <ReportLoadingState />
      ) : activeReport ? (
        <ReportResult report={activeReport} onRegenerate={handleRegenerate} isGenerating={isGenerating} />
      ) : (
        <ReportEmptyState />
      )}

      {recentReports.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Recent reports</CardTitle>
            <CardDescription>Open a saved report without generating it again</CardDescription>
            {isLoadingReport && (
              <CardAction>
                <IconLoader2 aria-label="Loading report" className="size-4 animate-spin text-muted-foreground" />
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="divide-y divide-border rounded-md border p-0">
            {recentReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => void handleOpenReport(report)}
                disabled={isLoadingReport}
                className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-3 text-left outline-none transition-colors hover:bg-muted/45 focus-visible:bg-muted disabled:cursor-wait disabled:opacity-60"
              >
                <IconFileAnalytics aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {getReportPeriodLabel(report)} · {AI_REPORT_TYPE_LABELS[report.type]}
                </span>
                <span className="hidden shrink-0 text-[0.6875rem] text-muted-foreground sm:inline">
                  {new Date(report.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </span>
                <IconChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="pb-1 text-center text-[0.6875rem] leading-5 text-muted-foreground">
        AI guidance may be inaccurate. Review recommendations before acting.
      </p>
    </div>
  );
}
