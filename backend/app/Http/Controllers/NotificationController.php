<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Notification;
use App\Models\User;
use App\Support\ApiPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();

        if ($actor->role === Role::Student) {
            $notifications = Notification::query()
                ->where('recipient_id', $actor->id)
                ->with('sender')
                ->latest()
                ->limit(200)
                ->get();

            return response()->json([
                'notifications' => $notifications->map(fn ($n) => ApiPresenter::notification($n))->values(),
                'unreadCount' => $notifications->where('is_read', false)->count(),
            ]);
        }

        if ($actor->role->isOneOf(Role::Admin, Role::Manager)) {
            $notifications = Notification::query()
                ->where('sender_id', $actor->id)
                ->with(['sender','recipient'])
                ->latest()
                ->limit(200)
                ->get();

            return response()->json([
                'notifications' => $notifications->map(fn ($n) => ApiPresenter::notification($n))->values(),
                'unreadCount' => 0,
            ]);
        }

        abort(403, 'ليس لديك صلاحية لعرض هذه الإشعارات');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'targetType' => ['required', Rule::in(['ALL','HALAQAH','STUDENT'])],
            'recipientUserId' => ['nullable', 'ulid'],
            'halaqahId' => ['nullable', 'ulid'],
            'title' => ['required','string','min:2','max:191'],
            'message' => ['required','string','min:3','max:4000'],
            'type' => ['nullable', Rule::in(['TASK','ACTIVITY','REMINDER'])],
            'eventAt' => ['nullable','date'],
        ]);

        $query = User::query()->where('role', Role::Student->value)->where('is_active', true);

        if ($data['targetType'] === 'STUDENT') {
            if (empty($data['recipientUserId'])) {
                throw ValidationException::withMessages(['recipientUserId' => 'يجب تحديد الطالب']);
            }
            $query->whereKey($data['recipientUserId']);
        } elseif ($data['targetType'] === 'HALAQAH') {
            if (empty($data['halaqahId'])) {
                throw ValidationException::withMessages(['halaqahId' => 'يجب تحديد الحلقة']);
            }
            $query->whereHas('studentProfile', fn ($q) => $q->where('halaqah_id', $data['halaqahId']));
        }

        $recipientIds = $query->pluck('id');
        if ($recipientIds->isEmpty()) {
            throw ValidationException::withMessages(['recipient' => 'لا يوجد طلاب نشطون لاستقبال الإشعار']);
        }

        DB::transaction(function () use ($request, $data, $recipientIds): void {
            foreach ($recipientIds as $recipientId) {
                Notification::query()->create([
                    'recipient_id' => $recipientId,
                    'sender_id' => $request->user()->id,
                    'title' => $data['title'],
                    'message' => $data['message'],
                    'type' => $data['type'] ?? 'TASK',
                    'event_at' => $data['eventAt'] ?? null,
                ]);
            }
        });

        $count = $recipientIds->count();
        $message = match ($data['targetType']) {
            'ALL' => "تم إرسال الإشعار إلى جميع الطلاب ({$count})",
            'HALAQAH' => "تم إرسال الإشعار إلى طلاب الحلقة ({$count})",
            default => 'تم إرسال الإشعار للطالب',
        };

        return response()->json(['recipientCount' => $count, 'message' => $message], 201);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->recipient_id === $request->user()->id, 404);
        $notification->update(['is_read' => true]);

        return response()->json([
            'notification' => ApiPresenter::notification($notification->fresh()->load('sender')),
            'message' => 'تم تعليم الإشعار كمقروء',
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::query()
            ->where('recipient_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'تم تعليم جميع الإشعارات كمقروءة']);
    }
}
