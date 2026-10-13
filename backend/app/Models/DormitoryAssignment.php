<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DormitoryAssignment extends Model
{
    use HasUlids;

    protected $fillable = ['student_id', 'building', 'room'];

    public function student(): BelongsTo { return $this->belongsTo(Student::class); }
}
