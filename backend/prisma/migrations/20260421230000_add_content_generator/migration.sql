-- CreateContentSuggestion
CREATE TABLE IF NOT EXISTS "ContentSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "snippet" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    CONSTRAINT "ContentSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateGeneratedContent
CREATE TABLE IF NOT EXISTS "GeneratedContent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hashtags" TEXT[],
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateScheduledPost
CREATE TABLE IF NOT EXISTS "ScheduledPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "publishAt" TIMESTAMP(3) NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "platform" TEXT NOT NULL DEFAULT 'linkedin',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentSuggestion_userId_source_fetchedAt_idx" ON "ContentSuggestion"("userId", "source", "fetchedAt");
CREATE INDEX IF NOT EXISTS "GeneratedContent_userId_status_idx" ON "GeneratedContent"("userId", "status");
CREATE INDEX IF NOT EXISTS "ScheduledPost_userId_status_publishAt_idx" ON "ScheduledPost"("userId", "status", "publishAt");

-- AddForeignKey
ALTER TABLE "ContentSuggestion" ADD CONSTRAINT "ContentSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "ContentSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "GeneratedContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
