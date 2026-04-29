/*
  Warnings:

  - Changed the type of `type` on the `notification_outbox` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'DINGTALK');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'RESOLVED', 'FAILED');

-- AlterTable
ALTER TABLE "notification_outbox" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "lastAttempt" TIMESTAMP(3),
ADD COLUMN     "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "progress_percent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lunarDate" TEXT,
    "year" INTEGER NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_year_date_key" ON "holidays"("year", "date");
