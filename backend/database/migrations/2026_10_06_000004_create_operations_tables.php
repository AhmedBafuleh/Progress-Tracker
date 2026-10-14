<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('requester_id')->constrained('users')->restrictOnDelete();
            $table->string('type', 24);
            $table->date('from_date');
            $table->date('to_date')->nullable();
            $table->text('reason')->nullable();
            $table->string('status', 20)->default('PENDING')->index();
            $table->foreignUlid('reviewed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->timestamps();
            $table->index(['requester_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('note_violations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('subject_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('author_id')->constrained('users')->restrictOnDelete();
            $table->string('kind', 20);
            $table->string('context', 191);
            $table->foreignUlid('halaqah_id')->nullable()->constrained('halaqahs')->nullOnDelete();
            $table->text('content');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_user_id', 'created_at']);
            $table->index(['author_id', 'created_at']);
        });

        Schema::create('monthly_tests', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUlid('examiner_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('halaqah_id')->constrained('halaqahs')->restrictOnDelete();
            $table->string('type', 24);
            $table->string('matn_name', 191)->nullable();
            $table->unsignedTinyInteger('score');
            $table->text('note')->nullable();
            $table->date('test_date');
            $table->timestamps();
            $table->index(['student_id', 'test_date']);
            $table->index(['halaqah_id', 'test_date']);
            $table->index(['examiner_id', 'test_date']);
        });

        Schema::create('monthly_test_questions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('monthly_test_id')->constrained('monthly_tests')->cascadeOnDelete();
            $table->unsignedTinyInteger('question_number');
            $table->boolean('correct');
            $table->string('surah', 100)->nullable();
            $table->unsignedSmallInteger('ayah')->nullable();
            $table->unsignedSmallInteger('ayah_to')->nullable();
            $table->text('reference_text')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['monthly_test_id', 'question_number']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('sender_id')->constrained('users')->restrictOnDelete();
            $table->string('title', 191);
            $table->text('message');
            $table->string('type', 24)->default('TASK');
            $table->dateTime('event_at')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['recipient_id', 'is_read', 'created_at']);
            $table->index(['sender_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('monthly_test_questions');
        Schema::dropIfExists('monthly_tests');
        Schema::dropIfExists('note_violations');
        Schema::dropIfExists('leave_requests');
    }
};
