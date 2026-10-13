<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Requests\StoreProgressRequest;
use App\Models\ProgressEntry;
use App\Models\SchedulePeriod;
use App\Models\Student;
use App\Support\ApiPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function periods(): JsonResponse
    {
        $periods = SchedulePeriod::query()->orderBy('number')->get();
        return response()->json(['periods' => $periods->map(fn ($p) => ApiPresenter::period($p))->values()]);
    }

    public function students(Request $request): JsonResponse
    {
        $actor = $request->user();

        $students = Student::query()
            ->with(['user','halaqah.teacher','dormitory'])
            ->when($actor->role === Role::Teacher, fn (Builder $q) => $q->whereHas('halaqah', fn ($h) => $h->where('teacher_id', $actor->id)))
            ->whereHas('user', fn ($q) => $q->where('is_active', true))
            ->get()
            ->sortBy(fn (Student $student) => $student->user->full_name, SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        return response()->json(['students' => $students->map(fn ($s) => ApiPresenter::student($s))->values()]);
    }

    public function children(Request $request): JsonResponse
    {
        $students = Student::query()
            ->with(['user','halaqah.teacher','dormitory'])
            ->whereHas('parentLinks', fn ($q) => $q->where('parent_id', $request->user()->id))
            ->get();

        return response()->json(['children' => $students->map(fn ($s) => ApiPresenter::student($s))->values()]);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        $query = ProgressEntry::query()->with(['student.user','student.halaqah','teacher','period']);

        match ($actor->role) {
            Role::Teacher => $query->whereHas('student.halaqah', fn ($q) => $q->where('teacher_id', $actor->id)),
            Role::Student => $query->whereHas('student', fn ($q) => $q->where('user_id', $actor->id)),
            Role::Parent => $query->whereHas('student.parentLinks', fn ($q) => $q->where('parent_id', $actor->id)),
            default => null,
        };

        $entries = $query->orderByDesc('record_date')->orderByDesc('created_at')->limit(500)->get();

        return response()->json(['entries' => $entries->map(fn ($e) => ApiPresenter::progress($e))->values()]);
    }

    public function store(StoreProgressRequest $request): JsonResponse
    {
        $actor = $request->user();
        $data = $request->validated();
        $student = Student::query()->with('halaqah')->findOrFail($data['studentId']);

        $this->assertTeacherAccess($actor, $student);

        $entry = ProgressEntry::query()->create(
            $this->normalizedData($data) + [
                'student_id' => $student->id,
                'teacher_id' => $actor->id,
                'period_id' => $data['periodId'],
                'record_date' => $data['recordDate'],
            ]
        );

        return response()->json([
            'entry' => ApiPresenter::progress($entry->load(['student.user','student.halaqah','teacher','period'])),
            'message' => 'تم حفظ متابعة الطالب بنجاح',
        ], 201);
    }

    public function update(StoreProgressRequest $request, ProgressEntry $entry): JsonResponse
    {
        $actor = $request->user();
        if ($actor->role === Role::Teacher && $entry->teacher_id !== $actor->id) {
            abort(403, 'لا يمكنك تعديل سجل أنشأه معلم آخر');
        }

        $data = $request->validated();
        $student = Student::query()->with('halaqah')->findOrFail($data['studentId']);
        $this->assertTeacherAccess($actor, $student);

        $entry->update(
            $this->normalizedData($data) + [
                'student_id' => $student->id,
                'period_id' => $data['periodId'],
                'record_date' => $data['recordDate'],
            ]
        );

        return response()->json([
            'entry' => ApiPresenter::progress($entry->fresh()->load(['student.user','student.halaqah','teacher','period'])),
            'message' => 'تم تحديث سجل المتابعة',
        ]);
    }

    public function destroy(Request $request, ProgressEntry $entry): JsonResponse
    {
        $actor = $request->user();
        if ($actor->role === Role::Teacher && $entry->teacher_id !== $actor->id) {
            abort(403, 'لا يمكنك حذف سجل أنشأه معلم آخر');
        }

        $entry->delete();
        return response()->json(['message' => 'تم حذف سجل المتابعة']);
    }

    private function assertTeacherAccess($actor, Student $student): void
    {
        if ($actor->role === Role::Teacher && $student->halaqah->teacher_id !== $actor->id) {
            abort(403, 'لا يمكنك تسجيل متابعة لهذا الطالب');
        }
    }

    private function normalizedData(array $data): array
    {
        $attended = (bool) $data['attended'];

        if (! $attended) {
            return [
                'attended' => false,
                'record_type' => null,
                'surah' => null,
                'verse_from' => null,
                'end_surah' => null,
                'verse_to' => null,
                'matn_name' => null,
                'matn_from' => null,
                'matn_to' => null,
                'pages' => 0,
                'rating' => null,
                'note' => $data['note'] ?? null,
            ];
        }

        $isMatn = ($data['recordType'] ?? null) === 'MATN';

        return [
            'attended' => true,
            'record_type' => $data['recordType'] ?? null,
            'surah' => $isMatn ? null : ($data['surah'] ?? null),
            'verse_from' => $isMatn ? null : ($data['verseFrom'] ?? null),
            'end_surah' => $isMatn ? null : ($data['endSurah'] ?? ($data['surah'] ?? null)),
            'verse_to' => $isMatn ? null : ($data['verseTo'] ?? null),
            'matn_name' => $isMatn ? ($data['matnName'] ?? null) : null,
            'matn_from' => $isMatn ? ($data['matnFrom'] ?? null) : null,
            'matn_to' => $isMatn ? ($data['matnTo'] ?? null) : null,
            'pages' => $data['pages'] ?? 0,
            'rating' => $data['rating'] ?? null,
            'note' => $data['note'] ?? null,
        ];
    }
}
