import { DailyReportRouteShell } from '@/components/daily-report/daily-report-route-shell';

export default async function ReportBoardPage({
  params,
}: {
  params: Promise<{ scopeId: string }>;
}) {
  const { scopeId } = await params;
  return <DailyReportRouteShell view='board' scopeId={scopeId} />;
}
