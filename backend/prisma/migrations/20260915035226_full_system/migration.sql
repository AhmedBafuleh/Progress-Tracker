-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'نشاط',
ADD COLUMN     "image_url" TEXT;

-- CreateTable
CREATE TABLE "home_page_content" (
    "id" TEXT NOT NULL DEFAULT 'home',
    "eyebrow" TEXT NOT NULL,
    "hero_title" TEXT NOT NULL,
    "hero_body" TEXT NOT NULL,
    "about_title" TEXT NOT NULL,
    "about_body" TEXT NOT NULL,
    "feature1_title" TEXT NOT NULL,
    "feature1_body" TEXT NOT NULL,
    "feature2_title" TEXT NOT NULL,
    "feature2_body" TEXT NOT NULL,
    "feature3_title" TEXT NOT NULL,
    "feature3_body" TEXT NOT NULL,
    "callout_title" TEXT NOT NULL,
    "callout_body" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_page_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PDF',
    "url" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_items_created_at_idx" ON "library_items"("created_at");
