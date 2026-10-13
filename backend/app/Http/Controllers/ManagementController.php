<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\DormitoryAssignment;
use App\Models\Halaqah;
use App\Models\ParentStudent;
use App\Models\SchedulePeriod;
use App\Models\Student;
use App\Models\User;
use App\Support\ApiPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ManagementController extends Controller
{
    public function teachers(): JsonResponse
    {
        $teachers = User::query()
            ->where('role', Role::Teacher->value)
            ->where('is_active', true)
            ->with('taughtHalaqahs:id,name,teacher_id')
            ->orderBy('full_name')
            ->get();

        return response()->json([
            'teachers' => $teachers->map(fn (User $teacher) => [
                'id' => $teacher->id,
                'loginId' => $teacher->login_id,
                'fullName' => $teacher->full_name,
                'taughtHalaqahs' => $teacher->taughtHalaqahs->map(fn ($h) => ['id' => $h->id, 'name' => $h->name])->values(),
            ])->values(),
        ]);
    }

    public function updateHalaqah(Request $request, Halaqah $halaqah): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:191', Rule::unique('halaqahs', 'name')->ignore($halaqah->id)],
            'teacherId' => ['sometimes', 'nullable', 'ulid', Rule::exists('users', 'id')->where('role', Role::Teacher->value)],
        ]);

        $halaqah->update([
            'name' => $data['name'] ?? $halaqah->name,
            'teacher_id' => array_key_exists('teacherId', $data) ? $data['teacherId'] : $halaqah->teacher_id,
        ]);

        return response()->json([
            'halaqah' => ApiPresenter::halaqah($halaqah->fresh()->load('teacher')),
            'message' => 'تم تحديث الحلقة',
        ]);
    }

    public function destroyHalaqah(Halaqah $halaqah): JsonResponse
    {
        if ($halaqah->students()->exists()) {
            return response()->json([
                'error' => ['message' => 'لا يمكن حذف حلقة مرتبطة بطلاب', 'code' => 'HALAQAH_IN_USE'],
            ], 409);
        }

        $halaqah->delete();
        return response()->json(['message' => 'تم حذف الحلقة']);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        $user->loadMissing('studentProfile.dormitory');

        if ($user->role === Role::Admin || ($actor->role === Role::Manager && $user->role === Role::Manager)) {
            abort(403, 'ليس لديك صلاحية لتعديل هذا الحساب');
        }

        $data = $request->validate([
            'fullName' => ['sometimes', 'string', 'min:2', 'max:191'],
            'email' => ['sometimes', 'nullable', 'email', 'max:191', Rule::unique('users', 'email')->ignore($user->id)],
            'mobile' => ['sometimes', 'nullable', 'regex:/^[0-9]{1,40}$/'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'age' => ['sometimes', 'nullable', 'integer', 'between:1,120'],
            'joinedAt' => ['sometimes', 'nullable', 'date'],
            'isActive' => ['sometimes', 'boolean'],
            'halaqahId' => ['sometimes', 'ulid', 'exists:halaqahs,id'],
            'memorizedAmount' => ['sometimes', 'nullable', 'string', 'max:191'],
            'building' => ['sometimes', 'nullable', 'string', 'max:100'],
            'room' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        DB::transaction(function () use ($user, $data): void {
            $user->fill([
                'full_name' => $data['fullName'] ?? $user->full_name,
                'email' => array_key_exists('email', $data) ? $data['email'] : $user->email,
                'mobile' => array_key_exists('mobile', $data) ? $data['mobile'] : $user->mobile,
                'address' => array_key_exists('address', $data) ? $data['address'] : $user->address,
                'age' => array_key_exists('age', $data) ? $data['age'] : $user->age,
                'joined_at' => array_key_exists('joinedAt', $data) ? $data['joinedAt'] : $user->joined_at,
                'is_active' => array_key_exists('isActive', $data) ? $data['isActive'] : $user->is_active,
            ])->save();

            if ($user->role === Role::Student && $user->studentProfile) {
                $student = $user->studentProfile;
                $student->fill([
                    'halaqah_id' => $data['halaqahId'] ?? $student->halaqah_id,
                    'memorized_amount' => array_key_exists('memorizedAmount', $data) ? $data['memorizedAmount'] : $student->memorized_amount,
                ])->save();

                if (array_key_exists('building', $data) || array_key_exists('room', $data)) {
                    DormitoryAssignment::query()->updateOrCreate(
                        ['student_id' => $student->id],
                        [
                            'building' => $data['building'] ?? $student->dormitory?->building ?? '',
                            'room' => $data['room'] ?? $student->dormitory?->room ?? '',
                        ],
                    );
                }
            }
        });

        if (array_key_exists('isActive', $data) && ! $data['isActive']) {
            $user->tokens()->delete();
        }

        return response()->json(['message' => 'تم تحديث الحساب']);
    }

    public function parentLinks(): JsonResponse
    {
        $links = ParentStudent::query()
            ->with(['parent', 'student.user', 'student.halaqah'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'links' => $links->map(fn (ParentStudent $link) => [
                'id' => $link->id,
                'createdAt' => $link->created_at?->toISOString(),
                'parent' => [
                    'id' => $link->parent->id,
                    'fullName' => $link->parent->full_name,
                    'loginId' => $link->parent->login_id,
                ],
                'student' => [
                    'id' => $link->student->id,
                    'user' => [
                        'id' => $link->student->user->id,
                        'fullName' => $link->student->user->full_name,
                        'loginId' => $link->student->user->login_id,
                    ],
                    'halaqah' => [
                        'id' => $link->student->halaqah->id,
                        'name' => $link->student->halaqah->name,
                    ],
                ],
            ])->values(),
        ]);
    }

    public function storeParentLink(Request $request): JsonResponse
    {
        $data = $request->validate([
            'parentUserId' => ['required', 'ulid', Rule::exists('users', 'id')->where('role', Role::Parent->value)],
            'studentUserId' => ['required', 'ulid', Rule::exists('users', 'id')->where('role', Role::Student->value)],
        ]);

        $student = Student::query()->where('user_id', $data['studentUserId'])->firstOrFail();

        ParentStudent::query()->firstOrCreate([
            'parent_id' => $data['parentUserId'],
            'student_id' => $student->id,
        ]);

        return response()->json(['message' => 'تم ربط ولي الأمر بالطالب'], 201);
    }

    public function destroyParentLink(ParentStudent $link): JsonResponse
    {
        $link->delete();
        return response()->json(['message' => 'تم حذف الربط']);
    }

    public function periods(): JsonResponse
    {
        $periods = SchedulePeriod::query()->orderBy('number')->get();
        return response()->json(['periods' => $periods->map(fn ($p) => ApiPresenter::period($p))->values()]);
    }

    public function storePeriod(Request $request): JsonResponse
    {
        $data = $request->validate([
            'number' => ['required', 'integer', 'min:1', 'unique:schedule_periods,number'],
            'name' => ['required', 'string', 'max:100'],
            'startTime' => ['required', 'date_format:H:i'],
            'endTime' => ['required', 'date_format:H:i', 'after:startTime'],
        ]);

        $period = SchedulePeriod::query()->create([
            'number' => $data['number'],
            'name' => $data['name'],
            'start_time' => $data['startTime'],
            'end_time' => $data['endTime'],
        ]);

        return response()->json(['period' => ApiPresenter::period($period), 'message' => 'تم إنشاء الفترة'], 201);
    }

    public function updatePeriod(Request $request, SchedulePeriod $period): JsonResponse
    {
        $data = $request->validate([
            'number' => ['sometimes', 'integer', 'min:1', Rule::unique('schedule_periods', 'number')->ignore($period->id)],
            'name' => ['sometimes', 'string', 'max:100'],
            'startTime' => ['sometimes', 'date_format:H:i'],
            'endTime' => ['sometimes', 'date_format:H:i'],
        ]);

        $period->update([
            'number' => $data['number'] ?? $period->number,
            'name' => $data['name'] ?? $period->name,
            'start_time' => $data['startTime'] ?? $period->start_time,
            'end_time' => $data['endTime'] ?? $period->end_time,
        ]);

        return response()->json(['period' => ApiPresenter::period($period->fresh()), 'message' => 'تم تحديث الفترة']);
    }

    public function destroyPeriod(SchedulePeriod $period): JsonResponse
    {
        if ($period->progressEntries()->exists()) {
            return response()->json([
                'error' => ['message' => 'لا يمكن حذف فترة مستخدمة في سجلات المتابعة', 'code' => 'PERIOD_IN_USE'],
            ], 409);
        }

        $period->delete();
        return response()->json(['message' => 'تم حذف الفترة']);
    }
}
