-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "format" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "coverPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "statusError" TEXT,
    "bookSummary" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "paragraphSummariesStatus" TEXT NOT NULL DEFAULT 'pending',
    "paragraphSummariesError" TEXT,
    CONSTRAINT "Chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paragraph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "fullText" TEXT NOT NULL,
    "summary" TEXT,
    CONSTRAINT "Paragraph_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    CONSTRAINT "Job_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "llmProvider" TEXT NOT NULL DEFAULT 'openai',
    "llmModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "apiKeys" TEXT NOT NULL DEFAULT '{}',
    "baseUrl" TEXT
);

-- CreateIndex
CREATE INDEX "Book_uploadedAt_idx" ON "Book"("uploadedAt");

-- CreateIndex
CREATE INDEX "Chapter_bookId_index_idx" ON "Chapter"("bookId", "index");

-- CreateIndex
CREATE INDEX "Paragraph_chapterId_index_idx" ON "Paragraph"("chapterId", "index");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");
