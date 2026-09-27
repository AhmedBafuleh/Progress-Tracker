-- CreateTable
CREATE TABLE "activity_assets" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_assets_activity_id_sort_order_idx" ON "activity_assets"("activity_id", "sort_order");

-- AddForeignKey
ALTER TABLE "activity_assets" ADD CONSTRAINT "activity_assets_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
