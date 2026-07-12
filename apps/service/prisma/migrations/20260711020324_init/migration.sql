-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('draft', 'confirmed');

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "report_status" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_staff_id_idx" ON "reports"("staff_id");
