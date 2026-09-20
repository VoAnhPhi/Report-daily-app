-- Chứng từ bổ sung cho lượt chuyển HALF (mọi nguồn), admin thêm bất cứ lúc nào.

CREATE TABLE IF NOT EXISTS "half_transfer_attachments" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "note" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "half_transfer_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "half_transfer_attachments_sourceType_sourceId_idx" ON "half_transfer_attachments"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "half_transfer_attachments_userId_createdAt_idx" ON "half_transfer_attachments"("userId", "createdAt");
