/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "home_page_content" ADD COLUMN     "footer_email" TEXT,
ADD COLUMN     "footer_facebook" TEXT,
ADD COLUMN     "footer_instagram" TEXT,
ADD COLUMN     "footer_phone" TEXT;

-- AlterTable
ALTER TABLE "progress_entries" ADD COLUMN     "attended" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "end_surah" TEXT,
ADD COLUMN     "matn_from" TEXT,
ADD COLUMN     "matn_name" TEXT,
ADD COLUMN     "matn_to" TEXT,
ADD COLUMN     "record_type" TEXT,
ALTER COLUMN "surah" DROP NOT NULL,
ALTER COLUMN "verse_from" DROP NOT NULL,
ALTER COLUMN "verse_to" DROP NOT NULL,
ALTER COLUMN "pages" SET DEFAULT 0,
ALTER COLUMN "rating" DROP NOT NULL;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "memorized_amount" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "joined_at" DATE,
ADD COLUMN     "mobile" TEXT;

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "from_date" DATE NOT NULL,
    "to_date" DATE,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes_violations" (
    "id" TEXT NOT NULL,
    "subject_user_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "halaqah_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_tests" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "examiner_id" TEXT NOT NULL,
    "halaqah_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "matn_name" TEXT,
    "score" INTEGER NOT NULL,
    "note" TEXT,
    "test_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_test_questions" (
    "id" TEXT NOT NULL,
    "monthly_test_id" TEXT NOT NULL,
    "question_number" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "surah" TEXT,
    "ayah" INTEGER,
    "reference_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_test_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_requests_requester_id_created_at_idx" ON "leave_requests"("requester_id", "created_at");

-- CreateIndex
CREATE INDEX "leave_requests_status_created_at_idx" ON "leave_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "notes_violations_subject_user_id_created_at_idx" ON "notes_violations"("subject_user_id", "created_at");

-- CreateIndex
CREATE INDEX "notes_violations_author_id_created_at_idx" ON "notes_violations"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "monthly_tests_student_id_test_date_idx" ON "monthly_tests"("student_id", "test_date");

-- CreateIndex
CREATE INDEX "monthly_tests_halaqah_id_test_date_idx" ON "monthly_tests"("halaqah_id", "test_date");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_test_questions_monthly_test_id_question_number_key" ON "monthly_test_questions"("monthly_test_id", "question_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes_violations" ADD CONSTRAINT "notes_violations_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes_violations" ADD CONSTRAINT "notes_violations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes_violations" ADD CONSTRAINT "notes_violations_halaqah_id_fkey" FOREIGN KEY ("halaqah_id") REFERENCES "halaqahs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_tests" ADD CONSTRAINT "monthly_tests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_tests" ADD CONSTRAINT "monthly_tests_examiner_id_fkey" FOREIGN KEY ("examiner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_tests" ADD CONSTRAINT "monthly_tests_halaqah_id_fkey" FOREIGN KEY ("halaqah_id") REFERENCES "halaqahs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_test_questions" ADD CONSTRAINT "monthly_test_questions_monthly_test_id_fkey" FOREIGN KEY ("monthly_test_id") REFERENCES "monthly_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
