-- Migration: Add Carousel model

CREATE TABLE IF NOT EXISTS "Carousel" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'linkedin',
  "slides" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduledAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "linkedinUrn" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Carousel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Carousel_userId_idx" ON "Carousel"("userId");
CREATE INDEX IF NOT EXISTS "Carousel_status_idx" ON "Carousel"("status");
CREATE INDEX IF NOT EXISTS "Carousel_scheduledAt_idx" ON "Carousel"("scheduledAt");
