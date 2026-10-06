<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Halaqah extends Model
{
    use HasUlids;

    protected $fillable = ['name', 'teacher_id'];

    public function teacher(): BelongsTo { return $this->belongsTo(User::class, 'teacher_id'); }
    public function students(): HasMany { return $this->hasMany(Student::class); }
    public function monthlyTests(): HasMany { return $this->hasMany(MonthlyTest::class); }
}
