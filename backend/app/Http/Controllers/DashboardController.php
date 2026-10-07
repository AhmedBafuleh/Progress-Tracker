<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Activity;
use App\Models\Halaqah;
use App\Models\LibraryItem;
use App\Models\ProgressEntry;
use App\Models\User;
use App\Support\ApiPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $actor = $request->user();

        $visibleUsers = User::query()
            ->when($actor->role === Role::Manager, fn (Builder $query) => $query->whereIn('role', [
                Role::Teacher->value,
                Role::Student->value,
                Role::Parent->value,
            ]));

        $progress = ProgressEntry::query();

        $latestProgress = (clone $progress)
            ->with(['student.user', 'student.halaqah', 'teacher', 'period'])
            ->orderByDesc('record_date')
            ->orderByDesc('created_at')
            ->limit(6)
            ->get();

        $averageRating = (float) ((clone $progress)
            ->whereNotNull('rating')
            ->avg('rating') ?? 0);

        return response()->json([
            'summary' => [
                'activeUsers' => (clone $visibleUsers)->where('is_active', true)->count(),
                'studentUsers' => (clone $visibleUsers)->where('role', Role::Student->value)->count(),
                'halaqahs' => Halaqah::query()->count(),
                'progressRecords' => $progress->count(),
                'libraryItems' => LibraryItem::query()->count(),
                'mediaActivities' => Activity::query()->count(),
                'averageRating' => $averageRating,
                'latestProgress' => $latestProgress
                    ->map(fn (ProgressEntry $entry) => ApiPresenter::progress($entry))
                    ->values(),
            ],
        ]);
    }
}
