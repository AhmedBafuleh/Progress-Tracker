<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_can_login_with_sanctum_token(): void
    {
        User::query()->create([
            'login_id' => 'ADMIN001',
            'full_name' => 'مدير النظام',
            'password' => 'StrongPassword123!',
            'role' => Role::Admin,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'loginId' => 'ADMIN001',
            'password' => 'StrongPassword123!',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.role', 'ADMIN')
            ->assertJsonStructure(['token', 'user' => ['id','loginId','fullName','role']]);
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::query()->create([
            'login_id' => 'T100',
            'full_name' => 'معلم',
            'password' => 'StrongPassword123!',
            'role' => Role::Teacher,
            'is_active' => false,
        ]);

        $this->postJson('/api/auth/login', [
            'loginId' => 'T100',
            'password' => 'StrongPassword123!',
        ])->assertUnauthorized();
    }
}
