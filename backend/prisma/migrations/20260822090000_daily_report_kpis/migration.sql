CREATE TABLE IF NOT EXISTS "daily_report_kpis" (
    "id" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "daily_report_kpis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_report_kpi_achievements" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "selectedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_report_kpi_achievements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "daily_report_kpis_scopeId_isActive_sortOrder_idx"
ON "daily_report_kpis"("scopeId", "isActive", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "daily_report_kpi_achievements_reportId_kpiId_key"
ON "daily_report_kpi_achievements"("reportId", "kpiId");
CREATE INDEX IF NOT EXISTS "daily_report_kpi_achievements_kpiId_reportId_idx"
ON "daily_report_kpi_achievements"("kpiId", "reportId");

CREATE INDEX IF NOT EXISTS "daily_report_kpi_achievements_selectedById_idx"
ON "daily_report_kpi_achievements"("selectedById");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_kpis_scopeId_fkey') THEN
    ALTER TABLE "daily_report_kpis"
      ADD CONSTRAINT "daily_report_kpis_scopeId_fkey" FOREIGN KEY ("scopeId") -- idempotency-ok: guarded
      REFERENCES "daily_report_scopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_kpi_achievements_reportId_fkey') THEN
    ALTER TABLE "daily_report_kpi_achievements"
      ADD CONSTRAINT "daily_report_kpi_achievements_reportId_fkey" FOREIGN KEY ("reportId") -- idempotency-ok: guarded
      REFERENCES "daily_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_kpi_achievements_kpiId_fkey') THEN
    ALTER TABLE "daily_report_kpi_achievements"
      ADD CONSTRAINT "daily_report_kpi_achievements_kpiId_fkey" FOREIGN KEY ("kpiId") -- idempotency-ok: guarded
      REFERENCES "daily_report_kpis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
