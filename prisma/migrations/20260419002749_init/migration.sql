-- CreateEnum
CREATE TYPE "AccompanimentType" AS ENUM ('melody', 'melody_metronome', 'melody_chords', 'melody_guitar', 'melody_pad');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hymn" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "author" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "defaultBpm" INTEGER NOT NULL,
    "timeSignature" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "xmlFilePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hymn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HymnSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hymnId" TEXT NOT NULL,
    "selectedKey" TEXT NOT NULL,
    "selectedBpm" INTEGER NOT NULL,
    "accompanimentType" "AccompanimentType" NOT NULL,
    "loopStart" INTEGER,
    "loopEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HymnSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HymnNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hymnId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HymnNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hymnId" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Hymn_title_idx" ON "Hymn"("title");

-- CreateIndex
CREATE INDEX "Hymn_category_idx" ON "Hymn"("category");

-- CreateIndex
CREATE INDEX "HymnSession_userId_idx" ON "HymnSession"("userId");

-- CreateIndex
CREATE INDEX "HymnSession_hymnId_idx" ON "HymnSession"("hymnId");

-- CreateIndex
CREATE INDEX "HymnNote_userId_idx" ON "HymnNote"("userId");

-- CreateIndex
CREATE INDEX "HymnNote_hymnId_idx" ON "HymnNote"("hymnId");

-- CreateIndex
CREATE INDEX "AIRecommendation_userId_idx" ON "AIRecommendation"("userId");

-- CreateIndex
CREATE INDEX "AIRecommendation_hymnId_idx" ON "AIRecommendation"("hymnId");

-- AddForeignKey
ALTER TABLE "HymnSession" ADD CONSTRAINT "HymnSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HymnSession" ADD CONSTRAINT "HymnSession_hymnId_fkey" FOREIGN KEY ("hymnId") REFERENCES "Hymn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HymnNote" ADD CONSTRAINT "HymnNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HymnNote" ADD CONSTRAINT "HymnNote_hymnId_fkey" FOREIGN KEY ("hymnId") REFERENCES "Hymn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_hymnId_fkey" FOREIGN KEY ("hymnId") REFERENCES "Hymn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
