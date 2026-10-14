<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgressEntry extends Model
{
    use HasUlids;

    protected $fillable = [
        'student_id','teacher_id','period_id','attended','record_type','surah',
        'verse_from','end_surah','verse_to','matn_name','matn_from','matn_to',
        'pages','rating','record_date','note',
    ];

    protected function casts(): array
    {
        return [
            'attended' => 'boolean',
            'pages' => 'decimal:2',
            'rating' => 'integer',
            'verse_from' => 'integer',
            'verse_to' => 'integer',
            'record_date' => 'date',
        ];
    }

    public function student(): BelongsTo { return $this->belongsTo(Student::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id')->withTrashed(); }
    public function period(): BelongsTo { return $this->belongsTo(SchedulePeriod::class, 'period_id'); }
}
