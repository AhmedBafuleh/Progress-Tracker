<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Requests\StoreUserRequest;
use App\Models\DormitoryAssignment;
use App\Models\Halaqah;
use App\Models\Student;
use App\Models\User;
use App\Support\ApiPresenter;
use App\Services\CredentialVaultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function __construct(private readonly CredentialVaultService $credentialVault) {}
    public function users(Request $request): JsonResponse
    {
        $actor = $request->user();

        $users = User::query()
            ->when($actor->role === Role::Manager, fn ($q) => $q->whereIn('role', [
                Role::Teacher->value, Role::Student->value, Role::Parent->value,
            ]))
            ->with(['studentProfile.halaqah', 'studentProfile.dormitory', 'credential'])
            ->orderBy('full_name')
            ->get();

        return response()->json([
            'users' => $users->map(fn (User $user) => ApiPresenter::user($user, true))->values(),
        ]);
    }

    public function storeUser(StoreUserRequest $request): JsonResponse
    {
        $actor = $request->user();
        $data = $request->validated();
        $role = Role::from($data['role']);

        $allowed = $actor->role === Role::Admin
            ? [Role::Manager, Role::Teacher, Role::Student, Role::Parent]
            : [Role::Teacher, Role::Student, Role::Parent];

        if (! in_array($role, $allowed, true)) {
            abort(403, 'لا يمكنك إنشاء هذا النوع من الحسابات');
        }

        if ($role === Role::Student && empty($data['halaqahId'])) {
            throw ValidationException::withMessages(['halaqahId' => 'يجب تحديد حلقة الطالب']);
        }

        $prefix = match ($role) {
            Role::Manager => 'MAN',
            Role::Teacher => 'TEA',
            Role::Student => 'STU',
            Role::Parent => 'PAR',
            default => '',
        };
        $loginId = $prefix.$data['loginNumber'];

        if (User::withTrashed()->where('login_id', $loginId)->exists()) {
            throw ValidationException::withMessages(['loginNumber' => 'معرف المستخدم مستخدم مسبقًا']);
        }

        DB::transaction(function () use ($data, $role, $loginId): void {
            $user = User::query()->create([
                'login_id' => $loginId,
                'full_name' => $data['fullName'],
                'password' => $data['password'],
                'role' => $role,
                'email' => $data['email'] ?? null,
                'mobile' => $data['mobile'] ?? null,
                'address' => $data['address'] ?? null,
                'age' => $data['age'] ?? null,
                'joined_at' => $data['joinedAt'] ?? null,
                'is_active' => true,
            ]);

            $this->credentialVault->store($user, $data['password']);

            if ($role === Role::Student) {
                $student = Student::query()->create([
                    'user_id' => $user->id,
                    'halaqah_id' => $data['halaqahId'],
                    'memorized_amount' => $data['memorizedAmount'] ?? null,
                ]);

                if (! empty($data['building']) || ! empty($data['room'])) {
                    DormitoryAssignment::query()->create([
                        'student_id' => $student->id,
                        'building' => $data['building'] ?? '',
                        'room' => $data['room'] ?? '',
                    ]);
                }
            }
        });

        return response()->json(['message' => 'تم إنشاء الحساب'], 201);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        $request->validate(['password' => ['required', 'string', 'min:8', 'max:128']]);

        $this->assertManageable($actor, $user);

        $password = (string) $request->string('password');

        DB::transaction(function () use ($user, $password): void {
            $user->forceFill(['password' => $password])->save();
            $this->credentialVault->store($user, $password);
            $user->tokens()->delete();
        });

        return response()->json(['message' => 'تم تحديث كلمة المرور وإلغاء جلسات الدخول القديمة']);
    }

    public function credential(Request $request, User $user): JsonResponse
    {
        $this->assertManageable($request->user(), $user);

        return response()
            ->json([
                'loginId' => $user->login_id,
                'password' => $this->credentialVault->reveal($request->user(), $user, $request),
            ])
            ->header('Cache-Control', 'no-store, private')
            ->header('Pragma', 'no-cache');
    }

    public function destroyUser(Request $request, User $user): JsonResponse
    {
        $this->assertManageable($request->user(), $user);

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => "تم حذف الحساب {$user->login_id}"]);
    }

    public function halaqahs(): JsonResponse
    {
        $halaqahs = Halaqah::query()
            ->with('teacher')
            ->withCount('students')
            ->orderBy('name')
            ->get();

        return response()->json([
            'halaqahs' => $halaqahs->map(fn (Halaqah $halaqah) => ApiPresenter::halaqah($halaqah, true))->values(),
        ]);
    }

    public function storeHalaqah(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'min:2', 'max:191', 'unique:halaqahs,name']]);
        $halaqah = Halaqah::query()->create($data)->load('teacher');

        return response()->json(['halaqah' => ApiPresenter::halaqah($halaqah)], 201);
    }

    private function assertManageable(User $actor, User $target): void
    {
        if ($target->role === Role::Admin || ($actor->role === Role::Manager && $target->role === Role::Manager)) {
            abort(403, 'لا يمكنك إدارة هذا الحساب');
        }
    }
}
