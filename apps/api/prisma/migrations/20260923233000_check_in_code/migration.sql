-- Short-lived codes shown in the live-session QR. The stable publicToken stays on the session.
CREATE TABLE "AttendanceCheckInCode" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceCheckInCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceCheckInCode_code_key" ON "AttendanceCheckInCode"("code");

CREATE INDEX "AttendanceCheckInCode_sessionId_issuedAt_idx" ON "AttendanceCheckInCode"("sessionId", "issuedAt");

ALTER TABLE "AttendanceCheckInCode" ADD CONSTRAINT "AttendanceCheckInCode_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
