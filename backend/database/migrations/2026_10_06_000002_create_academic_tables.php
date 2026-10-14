<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('halaqahs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 191)->unique();
            $table->foreignUlid('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('teacher_id');
        });

        Schema::create('students', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('halaqah_id')->constrained('halaqahs')->restrictOnDelete();
            $table->string('memorized_amount', 191)->nullable();
            $table->timestamps();
            $table->index('halaqah_id');
        });

        Schema::create('dormitory_assignments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('student_id')->unique()->constrained('students')->cascadeOnDelete();
            $table->string('building', 100);
            $table->string('room', 100);
            $table->timestamps();
        });

        Schema::create('parent_students', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('parent_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUlid('student_id')->constrained('students')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['parent_id', 'student_id']);
            $table->index('student_id');
        });

        Schema::create('schedule_periods', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->unsignedSmallInteger('number')->unique();
            $table->string('name', 100);
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();
        });

        Schema::create('progress_entries', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUlid('teacher_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('period_id')->constrained('schedule_periods')->restrictOnDelete();
            $table->boolean('attended')->default(true);
            $table->string('record_type', 24)->nullable();
            $table->string('surah', 100)->nullable();
            $table->unsignedSmallInteger('verse_from')->nullable();
            $table->string('end_surah', 100)->nullable();
            $table->unsignedSmallInteger('verse_to')->nullable();
            $table->string('matn_name', 191)->nullable();
            $table->string('matn_from', 191)->nullable();
            $table->string('matn_to', 191)->nullable();
            $table->decimal('pages', 6, 2)->default(0);
            $table->unsignedTinyInteger('rating')->nullable();
            $table->date('record_date');
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'record_date']);
            $table->index(['teacher_id', 'record_date']);
            $table->index(['period_id', 'record_date']);
            $table->index(['record_type', 'record_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('progress_entries');
        Schema::dropIfExists('schedule_periods');
        Schema::dropIfExists('parent_students');
        Schema::dropIfExists('dormitory_assignments');
        Schema::dropIfExists('students');
        Schema::dropIfExists('halaqahs');
    }
};
