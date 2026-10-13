<?php

namespace App\Support;

use App\Models\Activity;
use App\Models\ActivityAsset;
use App\Models\Halaqah;
use App\Models\LeaveRequest;
use App\Models\LibraryItem;
use App\Models\MonthlyTest;
use App\Models\Notification;
use App\Models\NoteViolation;
use App\Models\ProgressEntry;
use App\Models\SchedulePeriod;
use App\Models\Student;
use App\Models\User;

final class ApiPresenter
{
    public static function user(User $user, bool $managed = false): array
    {
        $data = [
            'id' => $user->id,
            'loginId' => $user->login_id,
            'fullName' => $user->full_name,
            'role' => $user->role->value,
        ];

        if (! $managed) {
            return $data;
        }

        $data += [
            'email' => $user->email,
            'mobile' => $user->mobile,
            'address' => $user->address,
            'age' => $user->age,
            'joinedAt' => $user->joined_at?->toDateString(),
            'isActive' => $user->is_active,
            'createdAt' => $user->created_at?->toISOString(),
            'passwordAvailable' => $user->relationLoaded('credential') ? $user->credential !== null : $user->credential()->exists(),
            'studentProfile' => $user->studentProfile ? [
                'halaqah' => $user->studentProfile->halaqah ? [
                    'id' => $user->studentProfile->halaqah->id,
                    'name' => $user->studentProfile->halaqah->name,
                ] : null,
                'dormitory' => $user->studentProfile->dormitory ? [
                    'building' => $user->studentProfile->dormitory->building,
                    'room' => $user->studentProfile->dormitory->room,
                ] : null,
                'memorizedAmount' => $user->studentProfile->memorized_amount,
            ] : null,
        ];

        return $data;
    }

    public static function halaqah(Halaqah $halaqah, bool $count = false): array
    {
        $data = [
            'id' => $halaqah->id,
            'name' => $halaqah->name,
            'teacherId' => $halaqah->teacher_id,
            'teacher' => $halaqah->teacher ? [
                'id' => $halaqah->teacher->id,
                'loginId' => $halaqah->teacher->login_id,
                'fullName' => $halaqah->teacher->full_name,
            ] : null,
        ];
        if ($count) {
            $data['_count'] = ['students' => (int) ($halaqah->students_count ?? 0)];
        }
        return $data;
    }

    public static function student(Student $student): array
    {
        return [
            'id' => $student->id,
            'user' => [
                'id' => $student->user->id,
                'loginId' => $student->user->login_id,
                'fullName' => $student->user->full_name,
                'isActive' => $student->user->is_active,
            ],
            'halaqah' => [
                'id' => $student->halaqah->id,
                'name' => $student->halaqah->name,
                'teacher' => $student->halaqah->teacher ? [
                    'id' => $student->halaqah->teacher->id,
                    'fullName' => $student->halaqah->teacher->full_name,
                ] : null,
            ],
            'dormitory' => $student->dormitory ? [
                'building' => $student->dormitory->building,
                'room' => $student->dormitory->room,
            ] : null,
        ];
    }

    public static function reportStudent(Student $student): array
    {
        return [
            'id' => $student->id,
            'memorizedAmount' => $student->memorized_amount,
            'user' => [
                'id' => $student->user->id,
                'loginId' => $student->user->login_id,
                'fullName' => $student->user->full_name,
                'email' => $student->user->email,
                'mobile' => $student->user->mobile,
                'age' => $student->user->age,
                'joinedAt' => $student->user->joined_at?->toDateString(),
                'isActive' => $student->user->is_active,
            ],
            'halaqah' => [
                'id' => $student->halaqah->id,
                'name' => $student->halaqah->name,
                'teacher' => $student->halaqah->teacher ? [
                    'id' => $student->halaqah->teacher->id,
                    'loginId' => $student->halaqah->teacher->login_id,
                    'fullName' => $student->halaqah->teacher->full_name,
                ] : null,
            ],
            'dormitory' => $student->dormitory ? [
                'building' => $student->dormitory->building,
                'room' => $student->dormitory->room,
            ] : null,
        ];
    }

    public static function period(SchedulePeriod $period): array
    {
        return [
            'id' => $period->id,
            'number' => $period->number,
            'name' => $period->name,
            'startTime' => substr((string) $period->start_time, 0, 5),
            'endTime' => substr((string) $period->end_time, 0, 5),
        ];
    }

    public static function progress(ProgressEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'attended' => $entry->attended,
            'recordType' => $entry->record_type,
            'surah' => $entry->surah,
            'verseFrom' => $entry->verse_from,
            'endSurah' => $entry->end_surah,
            'verseTo' => $entry->verse_to,
            'matnName' => $entry->matn_name,
            'matnFrom' => $entry->matn_from,
            'matnTo' => $entry->matn_to,
            'pages' => $entry->pages,
            'rating' => $entry->rating,
            'recordDate' => $entry->record_date->toDateString(),
            'note' => $entry->note,
            'createdAt' => $entry->created_at?->toISOString(),
            'student' => [
                'id' => $entry->student->id,
                'user' => [
                    'id' => $entry->student->user->id,
                    'fullName' => $entry->student->user->full_name,
                    'loginId' => $entry->student->user->login_id,
                ],
                'halaqah' => [
                    'id' => $entry->student->halaqah->id,
                    'name' => $entry->student->halaqah->name,
                ],
            ],
            'teacher' => [
                'id' => $entry->teacher->id,
                'fullName' => $entry->teacher->full_name,
                'loginId' => $entry->teacher->login_id,
            ],
            'period' => self::period($entry->period),
        ];
    }

    public static function activity(Activity $activity): array
    {
        return [
            'id' => $activity->id,
            'title' => $activity->title,
            'content' => $activity->content,
            'category' => $activity->category,
            'imageUrl' => $activity->image_url,
            'published' => $activity->published,
            'createdAt' => $activity->created_at?->toISOString(),
            'updatedAt' => $activity->updated_at?->toISOString(),
            'author' => $activity->author ? ['id' => $activity->author->id, 'fullName' => $activity->author->full_name] : null,
            'assets' => $activity->relationLoaded('assets')
                ? $activity->assets->map(fn (ActivityAsset $asset) => self::asset($asset))->values()->all()
                : [],
        ];
    }

    public static function asset(ActivityAsset $asset): array
    {
        return [
            'id' => $asset->id,
            'kind' => $asset->kind,
            'mimeType' => $asset->mime_type,
            'fileName' => $asset->file_name,
            'url' => $asset->url,
            'sortOrder' => $asset->sort_order,
            'createdAt' => $asset->created_at?->toISOString(),
        ];
    }

    public static function library(LibraryItem $item): array
    {
        return [
            'id' => $item->id,
            'title' => $item->title,
            'description' => $item->description,
            'type' => $item->type,
            'url' => $item->url,
            'coverUrl' => $item->cover_url,
            'published' => $item->published,
            'createdAt' => $item->created_at?->toISOString(),
            'updatedAt' => $item->updated_at?->toISOString(),
        ];
    }

    public static function leave(LeaveRequest $leave): array
    {
        return [
            'id' => $leave->id,
            'type' => $leave->type,
            'fromDate' => $leave->from_date->toDateString(),
            'toDate' => $leave->to_date?->toDateString(),
            'reason' => $leave->reason,
            'status' => $leave->status,
            'reviewNote' => $leave->review_note,
            'createdAt' => $leave->created_at?->toISOString(),
            'requester' => self::user($leave->requester),
            'reviewer' => $leave->reviewer ? ['id' => $leave->reviewer->id, 'fullName' => $leave->reviewer->full_name] : null,
        ];
    }

    public static function note(NoteViolation $note): array
    {
        return [
            'id' => $note->id,
            'kind' => $note->kind,
            'context' => $note->context,
            'content' => $note->content,
            'createdAt' => $note->created_at?->toISOString(),
            'subject' => self::user($note->subject),
            'author' => self::user($note->author),
            'halaqah' => $note->halaqah ? ['id' => $note->halaqah->id, 'name' => $note->halaqah->name] : null,
        ];
    }

    public static function test(MonthlyTest $test): array
    {
        return [
            'id' => $test->id,
            'type' => $test->type,
            'matnName' => $test->matn_name,
            'score' => $test->score,
            'note' => $test->note,
            'testDate' => $test->test_date->toDateString(),
            'createdAt' => $test->created_at?->toISOString(),
            'student' => [
                'id' => $test->student->id,
                'user' => [
                    'id' => $test->student->user->id,
                    'loginId' => $test->student->user->login_id,
                    'fullName' => $test->student->user->full_name,
                ],
            ],
            'examiner' => [
                'id' => $test->examiner->id,
                'loginId' => $test->examiner->login_id,
                'fullName' => $test->examiner->full_name,
            ],
            'halaqah' => ['id' => $test->halaqah->id, 'name' => $test->halaqah->name],
            'questions' => $test->questions->map(fn ($q) => [
                'id' => $q->id,
                'questionNumber' => $q->question_number,
                'correct' => $q->correct,
                'surah' => $q->surah,
                'ayah' => $q->ayah,
                'ayahTo' => $q->ayah_to,
                'referenceText' => $q->reference_text,
            ])->values()->all(),
        ];
    }

    public static function notification(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'recipientId' => $notification->recipient_id,
            'senderId' => $notification->sender_id,
            'title' => $notification->title,
            'message' => $notification->message,
            'type' => $notification->type,
            'eventAt' => $notification->event_at?->toISOString(),
            'isRead' => $notification->is_read,
            'createdAt' => $notification->created_at?->toISOString(),
            'sender' => $notification->relationLoaded('sender') && $notification->sender ? self::user($notification->sender) : null,
            'recipient' => $notification->relationLoaded('recipient') && $notification->recipient ? self::user($notification->recipient) : null,
        ];
    }
}
