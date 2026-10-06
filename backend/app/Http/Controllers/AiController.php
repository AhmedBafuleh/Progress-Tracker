<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\LeaveRequest;
use App\Models\MonthlyTest;
use App\Models\NoteViolation;
use App\Models\ProgressEntry;
use App\Models\User;
use App\Services\StudentReportService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class AiController extends Controller
{
    public function __construct(private readonly StudentReportService $reports) {}

    public function status(): JsonResponse
    {
        $baseUrl = rtrim((string) config('services.local_ai.base_url'), '/');
        $model = (string) config('services.local_ai.model');

        try {
            $response = Http::connectTimeout(3)->timeout(5)->get($baseUrl.'/api/tags');
            $models = collect($response->json('models', []));
            $installed = $response->successful() && $models->contains(
                fn ($item) => ($item['name'] ?? $item['model'] ?? null) === $model
            );

            return response()->json([
                'configured' => $installed,
                'connected' => $response->successful(),
                'model' => $model,
                'provider' => 'LOCAL',
                'baseUrl' => $baseUrl,
            ]);
        } catch (ConnectionException) {
            return response()->json([
                'configured' => false,
                'connected' => false,
                'model' => $model,
                'provider' => 'LOCAL',
                'baseUrl' => $baseUrl,
            ]);
        }
    }

    public function people(): JsonResponse
    {
        $people = User::query()
            ->where('is_active', true)
            ->with('studentProfile.halaqah')
            ->orderBy('role')
            ->orderBy('full_name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'loginId' => $user->login_id,
                'fullName' => $user->full_name,
                'role' => $user->role->value,
                'studentProfile' => $user->studentProfile ? [
                    'id' => $user->studentProfile->id,
                    'memorizedAmount' => $user->studentProfile->memorized_amount,
                    'halaqah' => [
                        'id' => $user->studentProfile->halaqah->id,
                        'name' => $user->studentProfile->halaqah->name,
                    ],
                ] : null,
            ])
            ->values();

        return response()->json(['people' => $people]);
    }

    public function analyze(Request $request): JsonResponse
    {
        $data = $request->validate([
            'userId' => ['required','ulid','exists:users,id'],
            'from' => ['nullable','date'],
            'to' => ['nullable','date','after_or_equal:from'],
            'audience' => ['nullable', Rule::in(['ADMIN','STUDENT','PARENT','TEACHER','MANAGER'])],
            'question' => ['nullable','string','max:2000'],
            'previousAnswers' => ['sometimes','array','max:4'],
            'previousAnswers.*' => ['string','max:5000'],
        ]);

        $person = User::query()->with(['studentProfile.halaqah'])->findOrFail($data['userId']);
        $context = $this->personContext($person, $request->user(), $data['from'] ?? null, $data['to'] ?? null);

        $audience = $data['audience'] ?? 'ADMIN';
        $labels = [
            'ADMIN' => 'الإدارة',
            'STUDENT' => 'الطالب',
            'PARENT' => 'ولي الأمر',
            'TEACHER' => 'المعلم',
            'MANAGER' => 'المشرف',
        ];

        $system = implode(' ', [
            'You are the private institutional analysis assistant for a Quran education center.',
            'Respond in clear professional Arabic.',
            'Use only the supplied institutional context and never invent facts, scores, motives, diagnoses, or events.',
            'Treat forecasts as cautious trajectory estimates, never certainties.',
            'For students, analyze attendance, Hifz, review, Matn, ratings, monthly tests, notes, and trends when present.',
            'For staff or parents, do not pretend they have student academic-performance data.',
            'Recommendations are advisory and must not make disciplinary, employment, or leave decisions.',
            'If data is insufficient, say so explicitly.',
            'The intended audience is '.$labels[$audience].'.',
            'Return valid JSON with keys: title, summary, trajectory {label, explanation}, recommendations [{title, reason, priority}], evidence, limitations, answer.',
        ]);

        $payload = [
            'model' => config('services.local_ai.model'),
            'stream' => false,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => json_encode([
                    'task' => $data['question'] ?? 'أنشئ تحليلاً شاملاً مبنياً على الأدلة مع توصيات عملية.',
                    'context' => $context,
                    'previousAnswers' => $data['previousAnswers'] ?? [],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)],
            ],
            'format' => 'json',
            'options' => ['temperature' => 0],
        ];

        try {
            $response = Http::acceptJson()
                ->timeout((int) config('services.local_ai.timeout', 120))
                ->post(rtrim((string) config('services.local_ai.base_url'), '/').'/api/chat', $payload);
        } catch (ConnectionException) {
            return response()->json([
                'error' => ['message' => 'تعذر الاتصال بخادم الذكاء الاصطناعي المحلي', 'code' => 'LOCAL_AI_UNAVAILABLE'],
            ], 503);
        }

        if ($response->failed()) {
            return response()->json([
                'error' => ['message' => 'تعذر تشغيل الذكاء الاصطناعي المحلي', 'code' => 'LOCAL_AI_ERROR'],
            ], 502);
        }

        $text = trim((string) $response->json('message.content', ''));
        $analysis = json_decode($text, true);

        if (! is_array($analysis)) {
            return response()->json([
                'error' => ['message' => 'تعذر قراءة نتيجة النموذج المحلي', 'code' => 'LOCAL_AI_INVALID_RESPONSE'],
            ], 502);
        }

        return response()->json([
            'analysis' => $analysis,
            'subject' => [
                'id' => $person->id,
                'loginId' => $person->login_id,
                'fullName' => $person->full_name,
                'role' => $person->role->value,
            ],
            'period' => $context['period'],
            'audience' => $audience,
            'model' => config('services.local_ai.model'),
            'provider' => 'LOCAL',
        ]);
    }

    private function personContext(User $person, User $actor, ?string $from, ?string $to): array
    {
        [$fromDate, $toDate] = $this->reports->range($from, $to);
        $base = [
            'subject' => [
                'id' => $person->id,
                'loginId' => $person->login_id,
                'fullName' => $person->full_name,
                'role' => $person->role->value,
                'age' => $person->age,
                'joinedAt' => $person->joined_at?->toDateString(),
            ],
            'period' => ['from' => $fromDate->toDateString(), 'to' => $toDate->toDateString()],
        ];

        if ($person->role === Role::Student && $person->studentProfile) {
            return $base + [
                'kind' => 'STUDENT',
                'studentReport' => $this->reports->build($person->studentProfile->id, $actor, $from, $to),
                'internalNotes' => NoteViolation::query()
                    ->where('subject_user_id', $person->id)
                    ->whereBetween('created_at', [$fromDate->startOfDay(), $toDate->endOfDay()])
                    ->with(['author','halaqah'])
                    ->latest()
                    ->limit(100)
                    ->get()
                    ->map(fn ($note) => [
                        'kind' => $note->kind,
                        'context' => $note->context,
                        'content' => $note->content,
                        'createdAt' => $note->created_at?->toISOString(),
                        'author' => ['fullName' => $note->author->full_name, 'role' => $note->author->role->value],
                        'halaqah' => $note->halaqah ? ['name' => $note->halaqah->name] : null,
                    ])
                    ->values(),
            ];
        }

        $leaves = LeaveRequest::query()
            ->where('requester_id', $person->id)
            ->whereBetween('created_at', [$fromDate->startOfDay(), $toDate->endOfDay()])
            ->latest()
            ->limit(100)
            ->get(['type','from_date','to_date','reason','status','review_note','created_at']);

        $notes = NoteViolation::query()
            ->where('subject_user_id', $person->id)
            ->whereBetween('created_at', [$fromDate->startOfDay(), $toDate->endOfDay()])
            ->latest()
            ->limit(100)
            ->get(['kind','context','content','created_at']);

        $base += ['leaves' => $leaves, 'receivedNotes' => $notes];

        if ($person->role === Role::Teacher) {
            $person->load('taughtHalaqahs');
            $progress = ProgressEntry::query()
                ->where('teacher_id', $person->id)
                ->whereBetween('record_date', [$fromDate->toDateString(), $toDate->toDateString()])
                ->limit(1000)
                ->get(['attended','record_type','pages','rating','record_date']);
            $tests = MonthlyTest::query()
                ->where('examiner_id', $person->id)
                ->whereBetween('test_date', [$fromDate->toDateString(), $toDate->toDateString()])
                ->limit(500)
                ->get(['type','score','test_date']);

            $ratings = $progress->pluck('rating')->filter(fn ($v) => is_numeric($v));

            return $base + [
                'kind' => 'TEACHER',
                'assignedHalaqahs' => $person->taughtHalaqahs->map(fn ($h) => [
                    'id' => $h->id,
                    'name' => $h->name,
                    'studentCount' => $h->students()->count(),
                ])->values(),
                'activitySummary' => [
                    'recordedSessions' => $progress->count(),
                    'attendedSessionsRecorded' => $progress->where('attended', true)->count(),
                    'totalPagesRecorded' => $progress->sum(fn ($row) => (float) $row->pages),
                    'averageRecordedRating' => $ratings->isEmpty() ? 0 : (float) $ratings->avg(),
                    'testsAdministered' => $tests->count(),
                    'averageTestScore' => $tests->isEmpty() ? 0 : (float) $tests->avg('score'),
                ],
            ];
        }

        return $base + [
            'kind' => $person->role->value,
            'dataNote' => 'Administrative context is limited to records available in this system.',
        ];
    }
}
