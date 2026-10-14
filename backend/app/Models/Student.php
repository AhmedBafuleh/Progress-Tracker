<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Student extends Model
{
    use HasUlids;

    protected $fillable = ['user_id', 'halaqah_id', 'memorized_amount'];

    public function user(): BelongsTo { return $this->belongsTo(User::class)->withTrashed(); }
    public function halaqah(): BelongsTo { return $this->belongsTo(Halaqah::class); }
    public function dormitory(): HasOne { return $this->hasOne(DormitoryAssignment::class); }
    public function progressEntries(): HasMany { return $this->hasMany(ProgressEntry::class); }
    public function parentLinks(): HasMany { return $this->hasMany(ParentStudent::class); }
    public function monthlyTests(): HasMany { return $this->hasMany(MonthlyTest::class); }
}
