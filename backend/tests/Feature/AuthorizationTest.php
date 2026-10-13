<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_cannot_access_admin_user_management(): void
    {
        $student = User::query()->create([
            'login_id' => 'S100',
            'full_name' => 'طالب',
            'password' => 'StrongPassword123!',
            'role' => Role::Student,
            'is_active' => true,
        ]);

        Sanctum::actingAs($student);

        $this->getJson('/api/admin/users')->assertForbidden();
    }
}
