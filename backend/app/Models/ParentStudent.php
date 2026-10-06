<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentStudent extends Model
{
    use HasUlids;

    const UPDATED_AT = null;

    protected $fillable = ['parent_id', 'student_id'];

    public function parent(): BelongsTo { return $this->belongsTo(User::class, 'parent_id')->withTrashed(); }
    public function student(): BelongsTo { return $this->belongsTo(Student::class); }
}
