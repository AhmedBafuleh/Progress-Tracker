<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonthlyTest extends Model
{
    use HasUlids;

    protected $fillable = ['student_id','examiner_id','halaqah_id','type','matn_name','score','note','test_date'];

    protected function casts(): array { return ['score' => 'integer', 'test_date' => 'date']; }

    public function student(): BelongsTo { return $this->belongsTo(Student::class); }
    public function examiner(): BelongsTo { return $this->belongsTo(User::class, 'examiner_id')->withTrashed(); }
    public function halaqah(): BelongsTo { return $this->belongsTo(Halaqah::class); }
    public function questions(): HasMany { return $this->hasMany(MonthlyTestQuestion::class)->orderBy('question_number'); }
}
