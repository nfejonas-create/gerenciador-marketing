-- CreateTable
CREATE TABLE "WeeklyContent" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "posts" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "weeklyContentId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WeeklyContent" ADD CONSTRAINT "WeeklyContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
