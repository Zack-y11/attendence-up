-- Grading status for a check-in. Existing rows were accepted check-ins, so they are Present.
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');

ALTER TABLE "AttendanceRecord"
ADD COLUMN "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT';
