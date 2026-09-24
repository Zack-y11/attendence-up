-- Grading status for a check-in. Existing rows were accepted check-ins, so they are Present.
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');

ALTER TABLE "AttendanceRecord"
ADD COLUMN "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
ADD COLUMN "absenceNote" TEXT;

-- A stored reason, when the student wrote one, has to be a real explanation.
ALTER TABLE "AttendanceRecord"
ADD CONSTRAINT "AttendanceRecord_absenceNote_check"
CHECK (
  "absenceNote" IS NULL
  OR (
    char_length(btrim("absenceNote")) >= 8
    AND char_length("absenceNote") <= 500
  )
);
