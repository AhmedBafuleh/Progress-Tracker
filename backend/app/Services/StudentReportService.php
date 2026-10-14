<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\MonthlyTest;
use App\Models\ProgressEntry;
use App\Models\Student;
use App\Models\User;
use App\Support\ApiPresenter;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class StudentReportService
{
    public function accessibleStudents(User $actor): Collection
    {
        return $this->scopeAccessible(Student::query(), $actor)
            ->with(['user','halaqah.teacher','dormitory'])
            ->get()
            ->sortBy(fn (Student $student) => $student->user->full_name, SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }

    public function build(string $studentId, User $actor, ?string $from = null, ?string $to = null): array
    {
        [$fromDate, $toDate] = $this->range($from, $to);

        $student = $this->scopeAccessible(Student::query(), $actor)
            ->with(['user','halaqah.teacher','dormitory'])
            ->find($studentId);

        abort_unless($student, 403, 'ليس لديك صلاحية لعرض تقرير هذا الطالب');

        $days = $fromDate->diffInDays($toDate) + 1;
        $previousTo = $fromDate->subDay();
        $previousFrom = $previousTo->subDays($days - 1);

        $progress = ProgressEntry::query()
            ->where('student_id', $student->id)
            ->whereBetween('record_date', [$fromDate->toDateString(), $toDate->toDateString()])
            ->with(['student.user','student.halaqah','teacher','period'])
            ->orderByDesc('record_date')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        $tests = MonthlyTest::query()
            ->where('student_id', $student->id)
            ->whereBetween('test_date', [$fromDate->toDateString(), $toDate->toDateString()])
            ->with(['student.user','examiner','halaqah','questions'])
            ->orderByDesc('test_date')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $previousProgress = ProgressEntry::query()
            ->where('student_id', $student->id)
            ->whereBetween('record_date', [$previousFrom->toDateString(), $previousTo->toDateString()])
            ->get(['attended','record_type','pages','rating']);

        $previousTests = MonthlyTest::query()
            ->where('student_id', $student->id)
            ->whereBetween('test_date', [$previousFrom->toDateString(), $previousTo->toDateString()])
            ->get(['score']);

        $attended = $progress->where('attended', true)->count();
        $currentRating = $this->average($progress->where('attended', true)->pluck('rating'));
        $previousRating = $this->average($previousProgress->where('attended', true)->pluck('rating'));
        $currentTest = $this->average($tests->pluck('score'));
        $previousTest = $this->average($previousTests->pluck('score'));

        $recordTypes = [];
        foreach (['HIFZ','NEAR_REVIEW','FAR_REVIEW','MATN'] as $type) {
            $rows = $progress->where('attended', true)->where('record_type', $type);
            $recordTypes[$type] = [
                'count' => $rows->count(),
                'averageRating' => $this->average($rows->pluck('rating')),
                'pages' => $rows->sum(fn ($row) => (float) $row->pages),
            ];
        }

        return [
            'student' => ApiPresenter::reportStudent($student),
            'period' => [
                'from' => $fromDate->toDateString(),
                'to' => $toDate->toDateString(),
                'previousFrom' => $previousFrom->toDateString(),
                'previousTo' => $previousTo->toDateString(),
            ],
            'summary' => [
                'sessions' => $progress->count(),
                'attended' => $attended,
                'absent' => $progress->count() - $attended,
                'attendanceRate' => $progress->count() ? ($attended / $progress->count()) * 100 : 0,
                'totalPages' => $progress->sum(fn ($entry) => (float) $entry->pages),
                'averageRating' => $currentRating,
                'tests' => $tests->count(),
                'averageTestScore' => $currentTest,
                'latestTestScore' => $tests->first()?->score,
                'recordTypes' => $recordTypes,
            ],
            'trend' => [
                'rating' => [
                    'current' => $currentRating,
                    'previous' => $previousRating,
                    'direction' => $this->trend($currentRating, $previousRating),
                ],
                'tests' => [
                    'current' => $currentTest,
                    'previous' => $previousTest,
                    'direction' => $this->trend($currentTest, $previousTest, 3),
                ],
            ],
            'progress' => $progress->map(fn ($entry) => ApiPresenter::progress($entry))->values()->all(),
            'tests' => $tests->map(fn ($test) => ApiPresenter::test($test))->values()->all(),
        ];
    }

    public function range(?string $from, ?string $to): array
    {
        try {
            $toDate = $to ? CarbonImmutable::parse($to)->startOfDay() : CarbonImmutable::today('UTC');
            $fromDate = $from ? CarbonImmutable::parse($from)->startOfDay() : $toDate->subDays(29);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['date' => 'نطاق تاريخ التقرير غير صالح']);
        }

        if ($fromDate->greaterThan($toDate)) {
            throw ValidationException::withMessages(['date' => 'نطاق تاريخ التقرير غير صالح']);
        }

        return [$fromDate, $toDate];
    }

    private function scopeAccessible(Builder $query, User $actor): Builder
    {
        return match ($actor->role) {
            Role::Teacher => $query->whereHas('halaqah', fn ($q) => $q->where('teacher_id', $actor->id)),
            Role::Student => $query->where('user_id', $actor->id),
            Role::Parent => $query->whereHas('parentLinks', fn ($q) => $q->where('parent_id', $actor->id)),
            default => $query,
        };
    }

    private function average(Collection $values): float
    {
        $valid = $values->filter(fn ($value) => is_numeric($value))->map(fn ($value) => (float) $value);
        return $valid->isEmpty() ? 0.0 : (float) $valid->avg();
    }

    private function trend(float $current, float $previous, float $tolerance = 0.15): string
    {
        if ($current == 0.0 && $previous == 0.0) return 'NO_DATA';
        if ($previous == 0.0) return 'NEW_DATA';
        $delta = $current - $previous;
        if ($delta > $tolerance) return 'IMPROVING';
        if ($delta < -$tolerance) return 'DECLINING';
        return 'STABLE';
    }
}
