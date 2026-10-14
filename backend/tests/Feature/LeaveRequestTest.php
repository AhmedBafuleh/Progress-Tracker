<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeaveRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_leave_request_is_auto_approved(): void
    {
        $admin = $this->user('ADMIN001', Role::Admin, 'مدير النظام');
        Sanctum::actingAs($admin);

        $this->postJson('/api/operations/leaves', [
            'type' => 'DAY_OFF',
            'fromDate' => '2026-10-14',
            'toDate' => '2026-10-14',
            'reason' => 'اختبار الاعتماد التلقائي',
        ])
            ->assertCreated()
            ->assertJsonPath('request.status', 'APPROVED')
            ->assertJsonPath('request.reviewer.id', $admin->id);

        $this->assertDatabaseHas('leave_requests', [
            'requester_id' => $admin->id,
            'status' => 'APPROVED',
            'reviewed_by_id' => $admin->id,
        ]);
    }

    public function test_non_admin_leave_request_stays_pending(): void
    {
        $teacher = $this->user('TEA100', Role::Teacher, 'معلم');
        Sanctum::actingAs($teacher);

        $this->postJson('/api/operations/leaves', [
            'type' => 'DAY_OFF',
            'fromDate' => '2026-10-14',
            'toDate' => '2026-10-14',
            'reason' => 'طلب عادي',
        ])
            ->assertCreated()
            ->assertJsonPath('request.status', 'PENDING')
            ->assertJsonPath('request.reviewer', null);

        $this->assertDatabaseHas('leave_requests', [
            'requester_id' => $teacher->id,
            'status' => 'PENDING',
            'reviewed_by_id' => null,
        ]);
    }

    private function user(string $loginId, Role $role, string $name): User
    {
        return User::query()->create([
            'login_id' => $loginId,
            'full_name' => $name,
            'password' => 'StrongPassword123!',
            'role' => $role,
            'is_active' => true,
        ]);
    }
}
