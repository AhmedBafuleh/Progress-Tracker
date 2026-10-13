<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('title', 191);
            $table->text('content');
            $table->string('category', 100)->default('نشاط')->index();
            $table->string('image_url', 500)->nullable();
            $table->foreignUlid('author_id')->constrained('users')->restrictOnDelete();
            $table->boolean('published')->default(true)->index();
            $table->timestamps();
            $table->index('created_at');
        });

        Schema::create('activity_assets', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('activity_id')->constrained('activities')->cascadeOnDelete();
            $table->string('kind', 20);
            $table->string('mime_type', 100);
            $table->string('file_name', 255);
            $table->string('url', 500);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['activity_id', 'sort_order']);
        });

        Schema::create('home_page_contents', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('eyebrow', 255);
            $table->string('hero_title', 255);
            $table->text('hero_body');
            $table->string('about_title', 255);
            $table->text('about_body');
            $table->string('feature1_title', 255);
            $table->text('feature1_body');
            $table->string('feature2_title', 255);
            $table->text('feature2_body');
            $table->string('feature3_title', 255);
            $table->text('feature3_body');
            $table->string('callout_title', 255);
            $table->text('callout_body');
            $table->string('footer_phone', 100)->nullable();
            $table->string('footer_email', 191)->nullable();
            $table->string('footer_instagram', 255)->nullable();
            $table->string('footer_facebook', 255)->nullable();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('library_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('title', 191);
            $table->text('description')->nullable();
            $table->string('type', 32)->default('PDF')->index();
            $table->string('url', 500);
            $table->string('cover_url', 500)->nullable();
            $table->boolean('published')->default(true)->index();
            $table->timestamps();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_items');
        Schema::dropIfExists('home_page_contents');
        Schema::dropIfExists('activity_assets');
        Schema::dropIfExists('activities');
    }
};
