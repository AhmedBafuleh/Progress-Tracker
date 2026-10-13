<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Requests\StoreMonthlyTestRequest;
use App\Models\Halaqah;
use App\Models\LeaveRequest;
use App\Models\MonthlyTest;
use App\Models\NoteViolation;
use App\Models\ProgressEntry;
use App\Models\Student;
use App\Models\User;
use App\Support\ApiPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OperationsController extends Controller
{
    public function leaves(Request $request): JsonResponse
    {
        $actor = $request->user();
        $query = LeaveRequest::query()->with(['requester','reviewer'])->latest();

        if ($actor->role !== Role::Admin) {
            $query->where('requester_id', $actor->id);
        }

        return response()->json([
            'requests' => $query->get()->map(fn ($leave) => ApiPresenter::leave($leave))->values(),
        ]);
    }

    public function storeLeave(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['VACATION','DAY_OFF'])],
            'fromDate' => ['required','date'],
            'toDate' => ['nullable','date','after_or_equal:fromDate'],
            'reason' => ['nullable','string','max:4000'],
        ]);

        $leave = LeaveRequest::query()->create([
            'requester_id' => $request->user()->id,
            'type' => $data['type'],
            'from_date' => $data['fromDate'],
            'to_date' => $data['toDate'] ?? null,
            'reason' => $data['reason'] ?? null,
            'status' => 'PENDING',
        ])->load(['requester','reviewer']);

        return response()->json(['request' => ApiPresenter::leave($leave), 'message' => 'تم إرسال طلب الإجازة'], 201);
    }

    public function reviewLeave(Request $request, LeaveRequest $leave): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['APPROVED','REJECTED'])],
            'reviewNote' => ['nullable','string','max:4000'],
        ]);

        $leave->update([
            'status' => $data['status'],
            'reviewed_by_id' => $request->user()->id,
            'review_note' => $data['reviewNote'] ?? null,
        ]);

        return response()->json([
            'request' => ApiPresenter::leave($leave->fresh()->load(['requester','reviewer'])),
            'message' => 'تمت مراجعة الطلب',
        ]);
    }

    public function notes(Request $request): JsonResponse
    {
        $actor = $request->user();
        $query = NoteViolation::query()->with(['subject','author','halaqah'])->latest();

        if ($actor->role === Role::Teacher) {
            $query->where(function ($q) use ($actor) {
                $q->where('author_id', $actor->id)
                    ->orWhereHas('subject.studentProfile.halaqah', fn ($h) => $h->where('teacher_id', $actor->id));
            });
        }

        return response()->json([
            'notes' => $query->get()->map(fn ($note) => ApiPresenter::note($note))->values(),
        ]);
    }

    public function storeNote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subjectUserId' => ['required','ulid','exists:users,id'],
            'kind' => ['required', Rule::in(['NOTE','VIOLATION'])],
            'context' => ['required','string','max:191'],
            'halaqahId' => ['nullable','ulid','exists:halaqahs,id'],
            'content' => ['required','string','max:4000'],
        ]);

        $actor = $request->user();
        if ($actor->role === Role::Teacher) {
            $allowed = Student::query()
                ->where('user_id', $data['subjectUserId'])
                ->whereHas('halaqah', fn ($q) => $q->where('teacher_id', $actor->id))
                ->exists();

            abort_unless($allowed, 403, 'لا يمكنك إضافة ملاحظة لهذا المستخدم');
        }

        $note = NoteViolation::query()->create([
            'subject_user_id' => $data['subjectUserId'],
            'author_id' => $actor->id,
            'kind' => $data['kind'],
            'context' => $data['context'],
            'halaqah_id' => $data['halaqahId'] ?? null,
            'content' => $data['content'],
        ])->load(['subject','author','halaqah']);

        return response()->json(['note' => ApiPresenter::note($note), 'message' => 'تم حفظ الملاحظة'], 201);
    }

    public function monthlyTestStudents(): JsonResponse
    {
        $students = Student::query()
            ->with(['user','halaqah.teacher','dormitory'])
            ->whereHas('user', fn ($query) => $query->where('is_active', true))
            ->get()
            ->sortBy(fn (Student $student) => $student->user->full_name, SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        return response()->json([
            'students' => $students->map(fn (Student $student) => ApiPresenter::student($student))->values(),
        ]);
    }

    public function monthlyTests(): JsonResponse
    {
        $query = MonthlyTest::query()
            ->with(['student.user','examiner','halaqah','questions'])
            ->latest('test_date');

        return response()->json([
            'tests' => $query->limit(200)->get()->map(fn ($test) => ApiPresenter::test($test))->values(),
        ]);
    }

    public function storeMonthlyTest(StoreMonthlyTestRequest $request): JsonResponse
    {
        $data = $request->validated();
        $actor = $request->user();
        $student = Student::query()->with('halaqah')->findOrFail($data['studentId']);

        $test = DB::transaction(function () use ($data, $actor, $student) {
            $test = MonthlyTest::query()->create([
                'student_id' => $student->id,
                'examiner_id' => $actor->id,
                'halaqah_id' => $student->halaqah_id,
                'type' => $data['type'],
                'matn_name' => $data['matnName'] ?? null,
                'score' => $data['score'],
                'note' => $data['note'] ?? null,
                'test_date' => $data['testDate'],
            ]);

            foreach ($data['questions'] ?? [] as $question) {
                $test->questions()->create([
                    'question_number' => $question['questionNumber'],
                    'correct' => $question['correct'],
                    'surah' => $question['surah'] ?? null,
                    'ayah' => $question['ayah'] ?? null,
                    'ayah_to' => $question['ayahTo'] ?? null,
                    'reference_text' => $question['referenceText'] ?? null,
                ]);
            }

            return $test;
        });

        return response()->json([
            'test' => ApiPresenter::test($test->load(['student.user','examiner','halaqah','questions'])),
            'message' => 'تم حفظ الاختبار الشهري',
        ], 201);
    }

    public function halaqahReport(Halaqah $halaqah): JsonResponse
    {
        $halaqah->load(['teacher','students.user','students.dormitory','students.halaqah.teacher']);
        $progress = ProgressEntry::query()
            ->whereHas('student', fn ($q) => $q->where('halaqah_id', $halaqah->id))
            ->with(['student.user','student.halaqah','teacher','period'])
            ->latest('record_date')
            ->limit(500)
            ->get();

        $tests = MonthlyTest::query()
            ->where('halaqah_id', $halaqah->id)
            ->with(['student.user','examiner','halaqah','questions'])
            ->latest('test_date')
            ->limit(200)
            ->get();

        $ratings = $progress->pluck('rating')->filter(fn ($v) => is_numeric($v));

        return response()->json([
            'report' => [
                'halaqah' => ApiPresenter::halaqah($halaqah) + [
                    'students' => $halaqah->students->map(fn ($student) => ApiPresenter::reportStudent($student))->values()->all(),
                ],
                'summary' => [
                    'students' => $halaqah->students->count(),
                    'progressRecords' => $progress->count(),
                    'attended' => $progress->where('attended', true)->count(),
                    'absent' => $progress->where('attended', false)->count(),
                    'averageRating' => $ratings->isEmpty() ? 0 : (float) $ratings->avg(),
                    'monthlyTests' => $tests->count(),
                    'averageTestScore' => $tests->isEmpty() ? 0 : (float) $tests->avg('score'),
                ],
                'progress' => $progress->map(fn ($entry) => ApiPresenter::progress($entry))->values()->all(),
                'tests' => $tests->map(fn ($test) => ApiPresenter::test($test))->values()->all(),
            ],
        ]);
    }
}
