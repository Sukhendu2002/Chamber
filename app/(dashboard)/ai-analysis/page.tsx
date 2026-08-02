import { AiAnalysisWorkspace } from "@/components/ai-analysis-workspace";
import { PageHeader, PageShell } from "@/components/page-shell";
import {
  getAiAnalysisPageData,
  getAiPeriodPreview,
} from "@/lib/actions/ai-analysis";
import {
  AI_REPORT_PERIODS,
  AI_REPORT_TYPES,
  type AiReportRequest,
} from "@/types/ai-analysis";

interface AiAnalysisPageProps {
  searchParams: Promise<{
    type?: string;
    period?: string;
    year?: string;
    month?: string;
  }>;
}

export default async function AiAnalysisPage({ searchParams }: AiAnalysisPageProps) {
  const [params, data] = await Promise.all([
    searchParams,
    getAiAnalysisPageData(),
  ]);

  const requestedType = AI_REPORT_TYPES.find((type) => type === params.type) || "DEEP_ANALYSIS";
  const requestedPeriod = AI_REPORT_PERIODS.find((period) => period === params.period) || "MONTHLY";
  const parsedYear = Number(params.year);
  const parsedMonth = Number(params.month);
  const selectedYear = Number.isInteger(parsedYear)
    && parsedYear >= 2000
    && parsedYear <= data.currentYear
    ? parsedYear
    : data.currentYear;
  const selectedMonth = Number.isInteger(parsedMonth)
    && parsedMonth >= 1
    && parsedMonth <= 12
    && !(selectedYear === data.currentYear && parsedMonth > data.currentMonth)
    ? parsedMonth
    : data.currentMonth;

  const initialRequest: AiReportRequest = {
    type: requestedType,
    period: requestedPeriod,
    year: selectedYear,
    month: requestedPeriod === "MONTHLY" ? selectedMonth : undefined,
    model: data.defaultModel || undefined,
  };
  const isDefaultPeriod =
    initialRequest.period === "MONTHLY"
    && initialRequest.year === data.currentYear
    && initialRequest.month === data.currentMonth;
  const initialPreview = isDefaultPeriod
    ? data.initialPreview
    : await getAiPeriodPreview(initialRequest);

  return (
    <PageShell>
      <PageHeader
        title="AI Analysis"
        description="Generate evidence-based reports from your Chamber data."
      />
      <AiAnalysisWorkspace
        data={data}
        initialRequest={initialRequest}
        initialPreview={initialPreview}
      />
    </PageShell>
  );
}
