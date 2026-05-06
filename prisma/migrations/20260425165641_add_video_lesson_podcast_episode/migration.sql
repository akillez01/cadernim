-- CreateTable
CREATE TABLE "VideoLesson" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "teacher" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'iniciante',
    "durationLabel" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "thumbnail" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'youtube',
    "materials" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodcastEpisode" (
    "id" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'iniciante',
    "durationLabel" TEXT NOT NULL DEFAULT '',
    "publishedLabel" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "coverImage" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL DEFAULT 'direct',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodcastEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoLesson_module_idx" ON "VideoLesson"("module");

-- CreateIndex
CREATE INDEX "VideoLesson_order_idx" ON "VideoLesson"("order");

-- CreateIndex
CREATE INDEX "PodcastEpisode_series_idx" ON "PodcastEpisode"("series");

-- CreateIndex
CREATE INDEX "PodcastEpisode_order_idx" ON "PodcastEpisode"("order");
