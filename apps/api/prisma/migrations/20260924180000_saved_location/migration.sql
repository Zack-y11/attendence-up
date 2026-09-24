-- CreateTable
CREATE TABLE "SavedLocation" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedLocation_instructorId_name_key" ON "SavedLocation"("instructorId", "name");

-- AddForeignKey
ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Same coordinate and radius limits as the session form.
ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_bounds" CHECK (
  "latitude" >= -90
  AND "latitude" <= 90
  AND "longitude" >= -180
  AND "longitude" <= 180
  AND "radiusMeters" > 0
  AND "radiusMeters" <= 100000
);
