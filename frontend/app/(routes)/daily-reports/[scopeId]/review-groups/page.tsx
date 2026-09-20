import { DailyReportRouteShell } from '@/components/daily-report/daily-report-route-shell';

export default async function ReportReviewGroupsPage({
  params,
}: {
  params: Promise<{ scopeId: string }>;
}) {
  const { scopeId } = await params;
  return <DailyReportRouteShell view='review-groups' scopeId={scopeId} />;
}
