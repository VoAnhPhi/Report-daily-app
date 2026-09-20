import { DailyReportRouteShell } from '@/components/daily-report/daily-report-route-shell';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ scopeId: string; reportId: string }>;
}) {
  const { scopeId, reportId } = await params;
  return (
    <DailyReportRouteShell
      view='report'
      scopeId={scopeId}
      reportId={reportId}
    />
  );
}
