-- CreateTable
CREATE TABLE "AttendanceExtensionInvite" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceExtensionInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceExtensionInvite_token_key" ON "AttendanceExtensionInvite"("token");

-- CreateIndex
CREATE INDEX "AttendanceExtensionInvite_sessionId_idx" ON "AttendanceExtensionInvite"("sessionId");

-- AddForeignKey
ALTER TABLE "AttendanceExtensionInvite" ADD CONSTRAINT "AttendanceExtensionInvite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
