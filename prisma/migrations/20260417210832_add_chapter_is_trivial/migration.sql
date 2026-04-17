-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "isTrivial" BOOLEAN NOT NULL DEFAULT false,
    "paragraphSummariesStatus" TEXT NOT NULL DEFAULT 'pending',
    "paragraphSummariesError" TEXT,
    CONSTRAINT "Chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("bookId", "id", "index", "paragraphSummariesError", "paragraphSummariesStatus", "summary", "title") SELECT "bookId", "id", "index", "paragraphSummariesError", "paragraphSummariesStatus", "summary", "title" FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";
CREATE INDEX "Chapter_bookId_index_idx" ON "Chapter"("bookId", "index");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
