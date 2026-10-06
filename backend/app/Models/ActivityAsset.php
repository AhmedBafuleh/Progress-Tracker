<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityAsset extends Model
{
    use HasUlids;

    const UPDATED_AT = null;

    protected $fillable = ['activity_id', 'kind', 'mime_type', 'file_name', 'url', 'sort_order'];

    protected function casts(): array { return ['sort_order' => 'integer']; }

    public function activity(): BelongsTo { return $this->belongsTo(Activity::class); }
}
