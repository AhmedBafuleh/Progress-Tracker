<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteViolation extends Model
{
    use HasUlids;

    const UPDATED_AT = null;

    protected $fillable = ['subject_user_id','author_id','kind','context','halaqah_id','content'];

    public function subject(): BelongsTo { return $this->belongsTo(User::class, 'subject_user_id')->withTrashed(); }
    public function author(): BelongsTo { return $this->belongsTo(User::class, 'author_id')->withTrashed(); }
    public function halaqah(): BelongsTo { return $this->belongsTo(Halaqah::class); }
}
