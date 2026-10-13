<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PhoneValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_phone_number_accepts_digits_only(): void
    {
        $admin = User::query()->create([
            'login_id' => 'ADMIN001',
            'full_name' => 'مدير النظام',
            'password' => 'StrongPassword123!',
            'role' => Role::Admin,
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/users', [
            'loginNumber' => '7001',
            'fullName' => 'معلم اختبار',
            'password' => 'StrongPassword123!',
            'role' => 'TEACHER',
            'mobile' => '05ABC123',
        ])->assertUnprocessable()->assertJsonValidationErrors('mobile');

        $this->postJson('/api/admin/users', [
            'loginNumber' => '7002',
            'fullName' => 'معلم أرقام',
            'password' => 'StrongPassword123!',
            'role' => 'TEACHER',
            'mobile' => '0501234567',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'login_id' => 'TEA7002',
            'mobile' => '0501234567',
        ]);
    }
}
