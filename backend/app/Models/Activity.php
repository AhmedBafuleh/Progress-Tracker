<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    use HasUlids;

    protected $fillable = ['title', 'content', 'category', 'image_url', 'author_id', 'published'];

    protected function casts(): array { return ['published' => 'boolean']; }

    public function author(): BelongsTo { return $this->belongsTo(User::class, 'author_id')->withTrashed(); }
    public function assets(): HasMany { return $this->hasMany(ActivityAsset::class)->orderBy('sort_order'); }
}
