<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Halaqah;
use App\Models\SchedulePeriod;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_accounts_use_full_role_prefix_and_can_login_with_it(): void
    {
        $admin = $this->user('ADMIN001', Role::Admin, 'مدير النظام');
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/users', [
            'loginNumber' => '69260001',
            'fullName' => 'معلم جديد',
            'password' => 'StrongPassword123!',
            'role' => 'TEACHER',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'login_id' => 'TEA69260001',
            'role' => 'TEACHER',
        ]);

        auth()->forgetGuards();

        $this->postJson('/api/auth/login', [
            'loginId' => 'TEA69260001',
            'password' => 'StrongPassword123!',
        ])->assertOk()->assertJsonPath('user.loginId', 'TEA69260001');
    }

    public function test_admin_cannot_record_progress_or_monthly_tests(): void
    {
        $admin = $this->user('ADMIN001', Role::Admin, 'مدير النظام');
        Sanctum::actingAs($admin);

        $this->postJson('/api/progress', [])->assertForbidden();
        $this->postJson('/api/operations/monthly-tests', [])->assertForbidden();
        $this->getJson('/api/operations/monthly-tests')->assertForbidden();
    }

    public function test_teacher_can_assess_monthly_test_for_student_in_another_halaqah_but_not_daily_progress(): void
    {
        $teacherA = $this->user('TEA100', Role::Teacher, 'المعلم الأول');
        $teacherB = $this->user('TEA200', Role::Teacher, 'المعلم الثاني');
        $studentUserA = $this->user('STU100', Role::Student, 'الطالب الأول');
        $studentUserB = $this->user('STU200', Role::Student, 'الطالب الثاني');

        $halaqahA = Halaqah::query()->create([
            'name' => 'الحلقة الأولى',
            'teacher_id' => $teacherA->id,
        ]);
        $halaqahB = Halaqah::query()->create([
            'name' => 'الحلقة الثانية',
            'teacher_id' => $teacherB->id,
        ]);

        Student::query()->create([
            'user_id' => $studentUserA->id,
            'halaqah_id' => $halaqahA->id,
        ]);
        $studentB = Student::query()->create([
            'user_id' => $studentUserB->id,
            'halaqah_id' => $halaqahB->id,
        ]);

        $period = SchedulePeriod::query()->create([
            'number' => 1,
            'name' => 'الفترة الأولى',
            'start_time' => '08:00',
            'end_time' => '09:00',
        ]);

        Sanctum::actingAs($teacherA);

        $this->getJson('/api/operations/monthly-test-students')
            ->assertOk()
            ->assertJsonFragment(['loginId' => 'STU200']);

        $this->postJson('/api/operations/monthly-tests', [
            'studentId' => $studentB->id,
            'type' => 'HIFZ',
            'score' => 100,
            'testDate' => '2026-10-13',
            'questions' => [
                [
                    'questionNumber' => 1,
                    'correct' => true,
                    'surah' => 'الفاتحة',
                    'ayah' => 1,
                    'ayahTo' => 1,
                ],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('monthly_tests', [
            'student_id' => $studentB->id,
            'examiner_id' => $teacherA->id,
            'halaqah_id' => $halaqahB->id,
            'score' => 100,
        ]);

        $this->postJson('/api/progress', [
            'studentId' => $studentB->id,
            'periodId' => $period->id,
            'attended' => true,
            'recordType' => 'HIFZ',
            'surah' => 'الفاتحة',
            'verseFrom' => 1,
            'endSurah' => 'الفاتحة',
            'verseTo' => 1,
            'pages' => 1,
            'rating' => 5,
            'recordDate' => '2026-10-13',
        ])->assertForbidden();
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
