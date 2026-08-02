export const AI_REPORT_TYPES = [
  "SPENDING_REVIEW",
  "SAVINGS_REVIEW",
  "DEEP_ANALYSIS",
] as const;

export const AI_REPORT_PERIODS = ["MONTHLY", "YEARLY"] as const;

export type AiReportType = (typeof AI_REPORT_TYPES)[number];
export type AiReportPeriod = (typeof AI_REPORT_PERIODS)[number];

export type AiFindingTone = "positive" | "neutral" | "warning";
export type AiOpportunityPriority = "high" | "medium" | "low";

export interface AiReportMetrics {
  totalSpent: number;
  spendingExcludingInvestments: number;
  budget: number;
  income: number;
  estimatedSavings: number | null;
  estimatedSavingsRate: number | null;
  savingsTargetRate: number;
  investmentContributions: number;
  previousPeriodSpending: number;
  spendingChangePercent: number | null;
  transactionCount: number;
}

export interface AiReportFinding {
  title: string;
  detail: string;
  evidence: string;
  tone: AiFindingTone;
}

export interface AiReportOpportunity {
  title: string;
  detail: string;
  monthlyImpact: number | null;
  priority: AiOpportunityPriority;
}

export interface AiReportAction {
  title: string;
  detail: string;
}

export interface AiReportContent {
  assessment: string;
  metrics: AiReportMetrics;
  findings: AiReportFinding[];
  opportunities: AiReportOpportunity[];
  actionPlan: AiReportAction[];
  caveats: string[];
}

export interface AiReportRecord {
  id: string;
  type: AiReportType;
  period: AiReportPeriod;
  year: number;
  month: number | null;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  currency: string;
  content: AiReportContent;
  createdAt: string;
}

export interface AiReportListItem {
  id: string;
  type: AiReportType;
  period: AiReportPeriod;
  year: number;
  month: number | null;
  createdAt: string;
}

export interface AiPeriodPreview {
  transactionCount: number;
  budgetReady: boolean;
  incomeReady: boolean;
}

export interface AiAnalysisPageData {
  currentYear: number;
  currentMonth: number;
  availableYears: number[];
  reportStorageReady: boolean;
  initialPreview: AiPeriodPreview;
  recentReports: AiReportListItem[];
  latestReport: AiReportRecord | null;
}

export interface AiReportRequest {
  type: AiReportType;
  period: AiReportPeriod;
  year: number;
  month?: number;
}

export const AI_REPORT_TYPE_LABELS: Record<AiReportType, string> = {
  SPENDING_REVIEW: "Spending Review",
  SAVINGS_REVIEW: "Savings Review",
  DEEP_ANALYSIS: "Deep Analysis",
};
