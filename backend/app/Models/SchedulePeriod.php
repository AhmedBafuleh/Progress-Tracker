<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchedulePeriod extends Model
{
    use HasUlids;

    protected $fillable = ['number', 'name', 'start_time', 'end_time'];

    protected function casts(): array { return ['number' => 'integer']; }

    public function progressEntries(): HasMany { return $this->hasMany(ProgressEntry::class, 'period_id'); }
}
