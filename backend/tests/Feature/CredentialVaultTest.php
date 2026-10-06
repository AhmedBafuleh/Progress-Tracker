<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\CredentialAccessLog;
use App\Models\User;
use App\Services\CredentialVaultService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CredentialVaultTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_admin_can_reveal_audited_encrypted_credential(): void
    {
        $admin = User::query()->create([
            'login_id' => 'ADMIN001',
            'full_name' => 'مدير النظام',
            'password' => 'AdminPassword123!',
            'role' => Role::Admin,
            'is_active' => true,
        ]);

        $teacher = User::query()->create([
            'login_id' => 'T100',
            'full_name' => 'معلم تجريبي',
            'password' => 'TeacherPassword123!',
            'role' => Role::Teacher,
            'is_active' => true,
        ]);

        app(CredentialVaultService::class)->store($teacher, 'TeacherPassword123!');

        $this->assertTrue(Hash::check('TeacherPassword123!', $teacher->password));
        $this->assertNotSame('TeacherPassword123!', $teacher->credential()->value('encrypted_password'));

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/users/{$teacher->id}/credential")
            ->assertOk()
            ->assertExactJson([
                'loginId' => 'T100',
                'password' => 'TeacherPassword123!',
            ]);

        $this->assertDatabaseHas('credential_access_logs', [
            'actor_id' => $admin->id,
            'target_user_id' => $teacher->id,
            'action' => 'VIEW',
        ]);
    }

    public function test_manager_cannot_reveal_another_manager_credential(): void
    {
        $manager = User::query()->create([
            'login_id' => 'M100',
            'full_name' => 'مشرف أول',
            'password' => 'ManagerPassword123!',
            'role' => Role::Manager,
            'is_active' => true,
        ]);

        $otherManager = User::query()->create([
            'login_id' => 'M101',
            'full_name' => 'مشرف ثان',
            'password' => 'OtherManagerPassword123!',
            'role' => Role::Manager,
            'is_active' => true,
        ]);

        app(CredentialVaultService::class)->store($otherManager, 'OtherManagerPassword123!');

        Sanctum::actingAs($manager);

        $this->getJson("/api/admin/users/{$otherManager->id}/credential")
            ->assertForbidden();

        $this->assertSame(0, CredentialAccessLog::query()->count());
    }

    public function test_password_reset_updates_hash_and_vault_together(): void
    {
        $admin = User::query()->create([
            'login_id' => 'ADMIN001',
            'full_name' => 'مدير النظام',
            'password' => 'AdminPassword123!',
            'role' => Role::Admin,
            'is_active' => true,
        ]);

        $teacher = User::query()->create([
            'login_id' => 'T100',
            'full_name' => 'معلم تجريبي',
            'password' => 'OldPassword123!',
            'role' => Role::Teacher,
            'is_active' => true,
        ]);

        app(CredentialVaultService::class)->store($teacher, 'OldPassword123!');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/users/{$teacher->id}/password", [
            'password' => 'NewPassword123!',
        ])->assertOk();

        $teacher->refresh();

        $this->assertTrue(Hash::check('NewPassword123!', $teacher->password));

        $this->getJson("/api/admin/users/{$teacher->id}/credential")
            ->assertOk()
            ->assertJsonPath('password', 'NewPassword123!');
    }
}
