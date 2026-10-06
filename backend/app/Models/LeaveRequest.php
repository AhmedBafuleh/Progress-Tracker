<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    use HasUlids;

    protected $fillable = [
        'requester_id','type','from_date','to_date','reason','status','reviewed_by_id','review_note',
    ];

    protected function casts(): array
    {
        return ['from_date' => 'date', 'to_date' => 'date'];
    }

    public function requester(): BelongsTo { return $this->belongsTo(User::class, 'requester_id')->withTrashed(); }
    public function reviewer(): BelongsTo { return $this->belongsTo(User::class, 'reviewed_by_id')->withTrashed(); }
}
