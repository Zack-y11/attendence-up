-- Class meeting times live on the class. Sessions keep the check-in window.
ALTER TABLE "Class" ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "endsAt" TIMESTAMP(3);

-- Carry the latest session schedule onto its class so existing meetings are not lost.
UPDATE "Class" AS c
SET
    "startsAt" = s."startsAt",
    "endsAt" = s."endsAt"
FROM (
    SELECT DISTINCT ON ("classId") "classId", "startsAt", "endsAt"
    FROM "AttendanceSession"
    WHERE "classId" IS NOT NULL
    ORDER BY "classId", "updatedAt" DESC
) AS s
WHERE c.id = s."classId";
