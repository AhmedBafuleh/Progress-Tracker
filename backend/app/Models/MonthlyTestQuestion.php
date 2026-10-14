<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyTestQuestion extends Model
{
    use HasUlids;

    const UPDATED_AT = null;

    protected $fillable = [
        'monthly_test_id','question_number','correct','surah','ayah','ayah_to','reference_text',
    ];

    protected function casts(): array
    {
        return ['question_number'=>'integer','correct'=>'boolean','ayah'=>'integer','ayah_to'=>'integer'];
    }

    public function monthlyTest(): BelongsTo { return $this->belongsTo(MonthlyTest::class); }
}
