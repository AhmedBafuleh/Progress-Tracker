<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_credentials', function (Blueprint $table) {
            $table->foreignUlid('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->longText('encrypted_password');
            $table->timestamp('rotated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('credential_access_logs', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('actor_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 20)->default('VIEW');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['actor_id', 'created_at']);
            $table->index(['target_user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credential_access_logs');
        Schema::dropIfExists('user_credentials');
    }
};
